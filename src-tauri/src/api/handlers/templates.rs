use crate::api::{
    error::{ApiError, ApiResponse},
    AppState,
};
use axum::{extract::State, Json};

pub async fn list_templates(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, ApiError> {
    let templates = sqlx::query_as::<_, jobdex_core::models::EmailTemplate>(
        "SELECT id, name, subject, body, attachment_paths, created_at, updated_at FROM email_templates ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;

    let result: Vec<serde_json::Value> = templates
        .iter()
        .map(|t| {
            let paths: Vec<String> = serde_json::from_str(&t.attachment_paths).unwrap_or_default();
            serde_json::json!({
                "id": t.id,
                "name": t.name,
                "subject": t.subject,
                "body": t.body,
                "attachmentPaths": paths,
                "createdAt": t.created_at,
                "updatedAt": t.updated_at,
            })
        })
        .collect();

    Ok(Json(ApiResponse::ok(result)))
}
