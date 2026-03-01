use crate::Db;
use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct TrackingEventPayload {
    pub tracking_id: String,
    #[serde(rename = "type")]
    pub event_type: String, // "open" | "click"
    pub url: Option<String>,
    pub occurred_at: String,
}

pub async fn poll_tracking_events(db: &Db) -> Result<usize> {
    // 1. Get tracking config
    let base_url_row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM settings WHERE key = 'tracking_base_url'")
            .fetch_optional(db.pool())
            .await?;
    let secret_row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM settings WHERE key = 'tracking_secret'")
            .fetch_optional(db.pool())
            .await?;

    let base_url = match base_url_row {
        Some((url,)) if !url.trim().is_empty() => url.trim().trim_end_matches('/').to_string(),
        _ => return Err(anyhow!("Tracking base URL not configured")),
    };

    let secret = match secret_row {
        Some((s,)) if !s.trim().is_empty() => s.trim().to_string(),
        _ => return Err(anyhow!("Tracking secret not configured")),
    };

    // 2. Poll the portfolio server
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/track/events", base_url))
        .query(&[("secret", &secret)])
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(anyhow!("Failed to fetch tracking events: {}", res.status()));
    }

    let events: Vec<TrackingEventPayload> = res.json().await?;
    let mut imported = 0;

    // 3. Process events
    for event in events {
        // Find message by tracking_id
        let msg_row: Option<(String,)> =
            sqlx::query_as("SELECT id FROM email_messages WHERE tracking_id = ?")
                .bind(&event.tracking_id)
                .fetch_optional(db.pool())
                .await?;

        if let Some((message_id,)) = msg_row {
            let id = uuid::Uuid::new_v4().to_string();
            // Try to parse timestamp, fallback to now
            let occurred_dt = DateTime::parse_from_rfc3339(&event.occurred_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            // Insert into email_tracking table, ignore duplicates
            let insert_res = sqlx::query(
                "INSERT INTO email_tracking (id, message_id, event_type, occurred_at, link_url) \
                 SELECT ?, ?, ?, ?, ? \
                 WHERE NOT EXISTS ( \
                    SELECT 1 FROM email_tracking \
                    WHERE message_id = ? AND event_type = ? AND occurred_at = ? \
                 )",
            )
            .bind(&id)
            .bind(&message_id)
            .bind(&event.event_type)
            .bind(occurred_dt)
            .bind(&event.url)
            .bind(&message_id)
            .bind(&event.event_type)
            .bind(occurred_dt)
            .execute(db.pool())
            .await?;

            if insert_res.rows_affected() > 0 {
                imported += 1;
            }
        }
    }

    Ok(imported)
}
