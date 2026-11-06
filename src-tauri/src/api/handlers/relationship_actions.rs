use crate::api::{
    error::{ApiError, ApiResponse},
    handlers::contacts::ensure_in_scope,
    scope,
    AppState,
};
use axum::{extract::State, Json};
use jobdex_core::relationship_agent::{actions, models::RelationshipAction};
use serde::Deserialize;

/// Newest actions for in-scope contacts. Actions are selected in SQL by contact
/// scope, then hydrated through the core mapper so nothing is duplicated here.
const MAX_ACTIONS: i64 = 200;

pub async fn list_actions(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<RelationshipAction>>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;

    let sql = format!(
        "SELECT id FROM relationship_actions WHERE status NOT IN ('dismissed') {} ORDER BY created_at DESC, id DESC LIMIT ?",
        scope.column_filter("contact_id")
    );
    let rows: Vec<(String,)> = scope
        .bind_as(sqlx::query_as::<_, (String,)>(&sql))
        .bind(MAX_ACTIONS)
        .fetch_all(pool)
        .await?;

    let mut result = Vec::with_capacity(rows.len());
    for (id,) in rows {
        result.push(
            actions::get(pool, &id)
                .await
                .map_err(|e| ApiError::Internal(e.to_string()))?,
        );
    }

    Ok(Json(ApiResponse::ok(result)))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposeDraftBody {
    pub contact_id: String,
    pub payload: jobdex_core::relationship_agent::models::EmailDraftPayload,
}

/// Externally authored drafts are durable `needs_review` actions. There is no remote
/// approval or delivery route: a native user always reviews and sends.
pub async fn propose_draft(
    State(state): State<AppState>,
    Json(body): Json<ProposeDraftBody>,
) -> Result<Json<ApiResponse<RelationshipAction>>, ApiError> {
    let pool = &state.pool;
    let scope = scope::load(pool).await?;
    scope.require_organize()?;
    ensure_in_scope(&scope, &body.contact_id)?;

    let action = actions::create_external_draft(pool, &body.contact_id, body.payload, "api")
        .await
        .map_err(|e| ApiError::Validation(e.to_string()))?;

    Ok(Json(ApiResponse::ok(action)))
}
