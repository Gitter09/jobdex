use crate::api::{
    error::{ApiError, ApiResponse},
    AppState,
};
use axum::{extract::State, Json};

pub async fn list_statuses(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<jobdex_core::models::Status>>>, ApiError> {
    let statuses = sqlx::query_as::<_, jobdex_core::models::Status>(
        "SELECT id, label, color, position, is_default FROM statuses ORDER BY position ASC",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(ApiResponse::ok(statuses)))
}
