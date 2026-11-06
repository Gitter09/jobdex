use crate::api::{
    error::{ApiError, ApiResponse},
    handlers::contacts::ensure_in_scope,
    scope,
    AppState,
};
use axum::{
    extract::{Path, State},
    Json,
};

pub async fn list_tags(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<jobdex_core::models::Tag>>>, ApiError> {
    let tags = sqlx::query_as::<_, jobdex_core::models::Tag>(
        "SELECT id, name, color, created_at FROM tags ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(ApiResponse::ok(tags)))
}

pub async fn assign_tag(
    State(state): State<AppState>,
    Path(ids): Path<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    let (contact_id, tag_id) = ids;
    let scope = scope::load(&state.pool).await?;
    scope.require_organize()?;
    ensure_in_scope(&scope, &contact_id)?;

    let tag_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM tags WHERE id = ?)")
            .bind(&tag_id)
            .fetch_one(&state.pool)
            .await?;
    if !tag_exists {
        return Err(ApiError::Validation(format!(
            "Tag '{}' does not exist.",
            tag_id
        )));
    }

    sqlx::query("INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)")
        .bind(&contact_id)
        .bind(&tag_id)
        .execute(&state.pool)
        .await?;
    Ok(Json(ApiResponse::ok(
        serde_json::json!({ "assigned": true }),
    )))
}

pub async fn unassign_tag(
    State(state): State<AppState>,
    Path(ids): Path<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, ApiError> {
    let (contact_id, tag_id) = ids;
    let scope = scope::load(&state.pool).await?;
    scope.require_organize()?;
    ensure_in_scope(&scope, &contact_id)?;

    sqlx::query("DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?")
        .bind(&contact_id)
        .bind(&tag_id)
        .execute(&state.pool)
        .await?;
    Ok(Json(ApiResponse::ok(
        serde_json::json!({ "unassigned": true }),
    )))
}
