use crate::api::{
    error::{ApiError, ApiResponse},
    AppState,
};
use axum::{extract::State, Json};

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EmailSignatureRow {
    id: String,
    name: String,
    content: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

pub async fn list_signatures(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<EmailSignatureRow>>>, ApiError> {
    let rows = sqlx::query_as::<_, EmailSignatureRow>(
        "SELECT id, name, content, created_at, updated_at FROM email_signatures ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(ApiResponse::ok(rows)))
}
