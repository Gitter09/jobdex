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
