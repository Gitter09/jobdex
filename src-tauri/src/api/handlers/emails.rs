use crate::api::{
    error::{ApiError, ApiResponse},
    handlers::contacts::ensure_in_scope,
    scope,
    AppState,
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;

const EMAIL_SELECT: &str = "SELECT m.id, m.thread_id, m.from_email, m.to_email, m.subject, m.body, m.html_body, m.sent_at, m.status, m.provider_message_id, m.manually_assigned, m.created_at";

/// Only the definition columns an external agent needs. Never tokens or expiry.
pub async fn list_accounts(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, ApiError> {
    #[derive(sqlx::FromRow)]
    struct AccountRow {
        id: String,
        provider: String,
        email: String,
        last_synced_at: Option<chrono::DateTime<chrono::Utc>>,
    }

    let rows = sqlx::query_as::<_, AccountRow>(
        "SELECT id, provider, email, last_synced_at FROM email_accounts ORDER BY created_at DESC",
    )
    .fetch_all(&state.pool)
    .await?;

    let safe: Vec<serde_json::Value> = rows
        .iter()
        .map(|a| {
            serde_json::json!({
                "id": a.id,
                "provider": a.provider,
                "email": a.email,
                "lastSyncedAt": a.last_synced_at,
            })
        })
        .collect();

    Ok(Json(ApiResponse::ok(safe)))
}

#[derive(Deserialize)]
pub struct ListEmailsQuery {
    pub status_filter: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Messages are scoped through their thread's contact; unrestricted rows are never selected.
pub async fn list_all(
    State(state): State<AppState>,
    Query(params): Query<ListEmailsQuery>,
) -> Result<Json<ApiResponse<Vec<jobdex_core::models::EmailMessage>>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;

    let mut sql = format!(
        "{} FROM email_messages m WHERE 1=1 {}",
        EMAIL_SELECT,
        scope.column_filter("(SELECT t.contact_id FROM email_threads t WHERE t.id = m.thread_id)")
    );
    if params.status_filter.is_some() {
        sql.push_str(" AND m.status = ?");
    }
    sql.push_str(" ORDER BY m.sent_at DESC LIMIT ? OFFSET ?");

    let mut query = scope.bind_as(sqlx::query_as::<_, jobdex_core::models::EmailMessage>(
        &sql,
    ));
    if let Some(ref status) = params.status_filter {
        query = query.bind(status.clone());
    }
    let emails = query
        .bind(params.limit.unwrap_or(100))
        .bind(params.offset.unwrap_or(0))
        .fetch_all(pool)
        .await?;

    Ok(Json(ApiResponse::ok(emails)))
}

pub async fn list_for_contact(
    State(state): State<AppState>,
    Path(contact_id): Path<String>,
) -> Result<Json<ApiResponse<Vec<jobdex_core::models::EmailMessage>>>, ApiError> {
    let scope = scope::load(&state.pool).await?;
    ensure_in_scope(&scope, &contact_id)?;

    let service = jobdex_core::EmailService::new(jobdex_core::Db::from_pool(state.pool.clone()));
    let emails = service
        .get_emails_for_contact(&contact_id)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(Json(ApiResponse::ok(emails)))
}

#[derive(Deserialize)]
pub struct ListScheduledQuery {
    pub contact_id: Option<String>,
}

pub async fn list_scheduled(
    State(state): State<AppState>,
    Query(params): Query<ListScheduledQuery>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;

    #[derive(sqlx::FromRow)]
    struct ScheduledRow {
        id: String,
        contact_id: String,
        contact_first_name: String,
        contact_last_name: String,
        account_id: String,
        subject: String,
        body: String,
        scheduled_at: chrono::DateTime<chrono::Utc>,
        status: String,
        error_message: Option<String>,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    if let Some(cid) = params.contact_id.as_deref() {
        ensure_in_scope(&scope, cid)?;
    }

    let mut sql = format!(
        "SELECT se.id, se.contact_id,
                COALESCE(c.first_name, '') AS contact_first_name,
                COALESCE(c.last_name, '') AS contact_last_name,
                se.account_id, se.subject, se.body, se.scheduled_at, se.status,
                se.error_message, se.created_at
         FROM scheduled_emails se
         LEFT JOIN contacts c ON se.contact_id = c.id
         WHERE 1=1 {}",
        scope.column_filter("se.contact_id")
    );
    if params.contact_id.is_some() {
        sql.push_str(" AND se.contact_id = ?");
    }
    sql.push_str(" ORDER BY se.scheduled_at ASC");

    let mut query = scope.bind_as(sqlx::query_as::<_, ScheduledRow>(&sql));
    if let Some(ref cid) = params.contact_id {
        query = query.bind(cid.clone());
    }
    let rows = query.fetch_all(pool).await?;

    let result: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "contactId": r.contact_id,
                "contactFirstName": r.contact_first_name,
                "contactLastName": r.contact_last_name,
                "accountId": r.account_id,
                "subject": r.subject,
                "body": r.body,
                "scheduledAt": r.scheduled_at,
                "status": r.status,
                "errorMessage": r.error_message,
                "createdAt": r.created_at,
            })
        })
        .collect();

    Ok(Json(ApiResponse::ok(result)))
}
