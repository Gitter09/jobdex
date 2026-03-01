use anyhow::Result;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

#[derive(Clone)]
pub struct Db {
    pool: SqlitePool,
}

impl Db {
    pub async fn new(db_path: &str) -> Result<Self> {
        // ?mode=rwc creates the file if it doesn't exist
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&format!("sqlite:{}?mode=rwc", db_path))
            .await?;

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

pub mod models {
    use chrono::{DateTime, Utc};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
    pub struct Contact {
        pub id: String,
        pub company_id: Option<String>,
        pub first_name: String,
        pub last_name: String,
        pub email: Option<String>,
        pub linkedin_url: Option<String>,

        // New fields for Contact Detail Redesign
        pub title: Option<String>,
        pub company: Option<String>,
        pub location: Option<String>,
        pub company_website: Option<String>,

        // Legacy status field (text), optional or deprecated
        pub status: Option<String>,

        // New Status System
        pub status_id: Option<String>,
        pub status_label: Option<String>, // Join result
        pub status_color: Option<String>, // Join result

        pub intelligence_summary: Option<String>,

        // AI Insights
        pub ai_talking_points: Option<String>,
        pub ai_company_intel: Option<String>,
        pub ai_last_analyzed: Option<DateTime<Utc>>,
        pub ai_profile_version: Option<i32>,

        // Dates & Cadence
        pub last_interaction_at: Option<DateTime<Utc>>, // kept for history
        pub last_contacted_date: Option<DateTime<Utc>>, // explicit field
        pub next_contact_date: Option<DateTime<Utc>>,
        pub cadence_stage: Option<i32>,

        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
    pub struct Status {
        pub id: String,
        pub label: String,
        pub color: String,
        pub is_default: bool,
        pub position: i32,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
    pub struct Company {
        pub id: String,
        pub name: String,
        pub domain: Option<String>,
        pub industry: Option<String>,
        pub description: Option<String>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
    pub struct Tag {
        pub id: String,
        pub name: String,
        pub color: String,
        pub created_at: DateTime<Utc>,
    }

    // Email CRM Models
    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
    pub struct EmailAccount {
        pub id: String,
        pub provider: String, // 'gmail', 'outlook'
        pub email: String,
        pub access_token: String,
        pub refresh_token: Option<String>,
        pub expires_at: Option<i64>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
    pub struct EmailThread {
        pub id: String,
        pub contact_id: String,
        pub account_id: String,
        pub subject: Option<String>,
        pub last_message_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
    pub struct EmailMessage {
        pub id: String,
        pub thread_id: String,
        pub from_email: String,
        pub to_email: String,
        pub subject: Option<String>,
        pub body: Option<String>,
        pub html_body: Option<String>,
        pub sent_at: Option<DateTime<Utc>>,
        pub status: Option<String>, // 'received', 'sent', 'draft'
        pub created_at: DateTime<Utc>,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
    pub struct ScheduledEmail {
        pub id: String,
        pub contact_id: String,
        pub account_id: String,
        pub subject: String,
        pub body: String,
        pub scheduled_at: DateTime<Utc>,
        pub status: String,
        pub error_message: Option<String>,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
    pub struct EmailTracking {
        pub id: String,
        pub message_id: String,
        pub event_type: String, // 'open', 'click'
        pub occurred_at: DateTime<Utc>,
        pub ip_address: Option<String>,
        pub user_agent: Option<String>,
        pub link_url: Option<String>,
    }
}
