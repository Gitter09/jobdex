use anyhow::Result;
use jobdex_core::db::Db;
use jobdex_core::email_service::EmailService;
use sqlx::Row;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::time;

#[derive(Clone, serde::Serialize)]
struct ScheduleFailedPayload {
    email_id: String,
    to_email: String,
    subject: String,
    error: String,
    /// `delivery_unknown` means the message may have been sent — never retried
    /// automatically.
    state: String,
}

struct PendingEmail {
    schedule_id: String,
    account_id: String,
    subject: String,
    body: String,
    to_email: Option<String>,
    attachment_paths: String,
}

static SHUTDOWN_FLAG: AtomicBool = AtomicBool::new(false);

pub fn start_email_scheduler(app_handle: AppHandle, db: Db) {
    tauri::async_runtime::spawn(async move {
        // Any row left mid-send by a previous process is ambiguous, not retryable.
        recover_interrupted_sends(&db).await;

        let mut interval = time::interval(Duration::from_secs(60));
        let email_service = EmailService::new(db.clone());

        loop {
            interval.tick().await;

            if SHUTDOWN_FLAG.load(Ordering::Relaxed) {
                #[cfg(debug_assertions)]
                eprintln!("Scheduler shutting down — app is closing");
                break;
            }

            if let Err(_e) = check_and_send_scheduled_emails(&app_handle, &db, &email_service).await
            {
                #[cfg(debug_assertions)]
                eprintln!("Error in scheduled email loop: {}", _e);
            }
        }
    });
}

pub fn stop_email_scheduler() {
    SHUTDOWN_FLAG.store(true, Ordering::Relaxed);
}

async fn recover_interrupted_sends(db: &Db) {
    let result = sqlx::query(
        "UPDATE scheduled_emails SET status = 'delivery_unknown', error_message = 'Interrupted during send — check Sent mail before sending again'
         WHERE status = 'sending'",
    )
    .execute(db.pool())
    .await;

    if let Err(e) = result {
        #[cfg(debug_assertions)]
        eprintln!("Failed to recover interrupted scheduled sends: {}", e);
    }
}


async fn check_and_send_scheduled_emails(
    app_handle: &AppHandle,
    db: &Db,
    email_service: &EmailService,
) -> Result<()> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id as schedule_id,
            s.account_id,
            s.subject,
            s.body,
            c.email as to_email,
            s.attachment_paths
        FROM scheduled_emails s
        JOIN contacts c ON s.contact_id = c.id
        WHERE s.status = 'pending'
        AND datetime(s.scheduled_at) <= CURRENT_TIMESTAMP
        "#,
    )
    .fetch_all(db.pool())
    .await?;

    let pending_emails: Vec<PendingEmail> = rows
        .into_iter()
        .map(|row| PendingEmail {
            schedule_id: row.get("schedule_id"),
            account_id: row.get("account_id"),
            subject: row.get("subject"),
            body: row.get("body"),
            to_email: row.get("to_email"),
            attachment_paths: row
                .get::<Option<String>, _>("attachment_paths")
                .unwrap_or_else(|| "[]".to_string()),
        })
        .collect();

    for email in pending_emails {
        let to_email = match email.to_email {
            Some(e) if !e.trim().is_empty() => e,
            _ => {
                // Preflight failure: nothing was handed to the provider.
                persist_status(
                    db,
                    &email.schedule_id,
                    "UPDATE scheduled_emails SET status = 'failed', error_message = 'Contact has no email address' WHERE id = ?",
                )
                .await;
                continue;
            }
        };

        // Claim exactly once: pending -> sending.
        let claimed = sqlx::query(
            "UPDATE scheduled_emails SET status = 'sending', send_started_at = ? WHERE id = ? AND status = 'pending'",
        )
        .bind(chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
        .bind(&email.schedule_id)
        .execute(db.pool())
        .await;

        match claimed {
            Ok(result) if result.rows_affected() == 1 => {}
            Ok(_) => continue, // lost the race to another tick or process
            Err(e) => {
                #[cfg(debug_assertions)]
                eprintln!("Failed to claim scheduled email {}: {}", email.schedule_id, e);
                continue;
            }
        }

        let paths: Vec<String> = serde_json::from_str(&email.attachment_paths).unwrap_or_default();
        let result = email_service
            .send_email(
                &email.account_id,
                &to_email,
                &email.subject,
                &email.body,
                paths,
            )
            .await;

        match result {
            Ok(receipt) => {
                let updated = sqlx::query(
                    "UPDATE scheduled_emails SET status = 'sent', provider_receipt = ?, error_message = NULL WHERE id = ?",
                )
                .bind(&receipt)
                .bind(&email.schedule_id)
                .execute(db.pool())
                .await;
                if let Err(e) = updated {
                    // The message went out; losing the status write would leave the
                    // row in `sending` and be recovered as delivery_unknown.
                    #[cfg(debug_assertions)]
                    eprintln!(
                        "Sent scheduled email {} but failed to persist status: {}",
                        email.schedule_id, e
                    );
                }
            }
            Err(e) => {
                // The request reached the provider and its outcome is unknown.
                // Retrying here could deliver the same email twice.
                let error_msg = e.to_string();
                persist_status(
                    db,
                    &email.schedule_id,
                    "UPDATE scheduled_emails SET status = 'delivery_unknown', error_message = 'Delivery could not be confirmed — check Sent mail before sending again' WHERE id = ?",
                )
                .await;

                let _ = app_handle.emit(
                    "email_schedule_failed",
                    ScheduleFailedPayload {
                        email_id: email.schedule_id.clone(),
                        to_email: to_email.clone(),
                        subject: email.subject.clone(),
                        error: error_msg,
                        state: "delivery_unknown".to_string(),
                    },
                );
            }
        }
    }

    Ok(())
}

async fn persist_status(db: &Db, schedule_id: &str, statement: &str) {
    if let Err(e) = sqlx::query(statement)
        .bind(schedule_id)
        .execute(db.pool())
        .await
    {
        #[cfg(debug_assertions)]
        eprintln!(
            "Failed to persist status for scheduled email {}: {}",
            schedule_id, e
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn restart_quarantines_only_interrupted_sends_and_preserves_receipts() {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("../src-core/migrations").run(&pool).await.unwrap();
        let db = Db::from_pool(pool);
        let mut tx = db.pool().begin().await.unwrap();
        sqlx::query("INSERT INTO contacts (id, first_name, last_name) VALUES ('recovery-contact', 'Test', 'Person')")
            .execute(&mut *tx).await.unwrap();
        sqlx::query("INSERT INTO email_accounts (id, provider, email, access_token) VALUES ('recovery-account', 'gmail', 'me@example.invalid', 'fake-token')")
            .execute(&mut *tx).await.unwrap();
        for status in ["pending", "sending", "sent", "failed", "delivery_unknown"] {
            let started = matches!(status, "sending" | "sent" | "delivery_unknown");
            sqlx::query("INSERT INTO scheduled_emails (id, contact_id, account_id, subject, body, scheduled_at, status, send_started_at, provider_receipt) VALUES (?, 'recovery-contact', 'recovery-account', 'Test', 'Test', '2026-01-01T00:00:00Z', ?, ?, ?)")
                .bind(status)
                .bind(status)
                .bind(started.then_some("2026-01-01T00:01:00Z"))
                .bind(started.then_some("provider-acknowledgement"))
                .execute(&mut *tx).await.unwrap();
        }
        tx.commit().await.unwrap();
        type DeliveryRow = (String, String, String, Option<String>, Option<String>);
        let before: Vec<DeliveryRow> = sqlx::query_as(
            "SELECT id, status, scheduled_at, send_started_at, provider_receipt FROM scheduled_emails ORDER BY id",
        ).fetch_all(db.pool()).await.unwrap();

        recover_interrupted_sends(&db).await;
        recover_interrupted_sends(&db).await;

        let after: Vec<DeliveryRow> = sqlx::query_as(
            "SELECT id, status, scheduled_at, send_started_at, provider_receipt FROM scheduled_emails ORDER BY id",
        ).fetch_all(db.pool()).await.unwrap();
        let expected: Vec<DeliveryRow> = before.into_iter().map(|mut row| {
            if row.1 == "sending" {
                row.1 = "delivery_unknown".to_string();
            }
            row
        }).collect();
        assert_eq!(after, expected);
    }
}
