use crate::api::{auth, handlers, AppState};
use axum::{middleware, routing::*, Router};

/// External authority is defined here, not by MCP tool descriptions.
///
/// Reads are scoped to the contacts the user selected for API access. Writes
/// exist only for harmless organization. Sending, scheduling, deleting,
/// importing, exporting, account mutation and settings access have no route:
/// those stay native-only.
pub fn create_router(state: AppState) -> Router {
    let sse_routes = Router::new()
        .route("/sse", get(handlers::sse::sse_handler))
        .route("/sse/message", post(handlers::sse::sse_message_handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::auth_middleware,
        ));

    let api_routes = Router::new()
        .route(
            "/contacts",
            get(handlers::contacts::list_contacts).post(handlers::contacts::create_contact),
        )
        .route(
            "/contacts/bulk-status",
            post(handlers::contacts::bulk_update_status),
        )
        .route(
            "/contacts/{id}",
            get(handlers::contacts::get_contact).patch(handlers::contacts::update_contact),
        )
        .route(
            "/contacts/{id}/tags/{tag_id}",
            post(handlers::tags::assign_tag).delete(handlers::tags::unassign_tag),
        )
        .route(
            "/contacts/{id}/emails",
            get(handlers::emails::list_for_contact),
        )
        .route(
            "/contacts/{id}/events",
            get(handlers::events::list_events).post(handlers::events::create_event),
        )
        .route(
            "/contacts/{id}/events/{event_id}",
            patch(handlers::events::update_event),
        )
        .route(
            "/contacts/{id}/activity",
            get(handlers::events::get_activity),
        )
        .route("/statuses", get(handlers::statuses::list_statuses))
        .route("/tags", get(handlers::tags::list_tags))
        .route("/email-accounts", get(handlers::emails::list_accounts))
        .route("/emails", get(handlers::emails::list_all))
        .route("/emails/scheduled", get(handlers::emails::list_scheduled))
        .route("/templates", get(handlers::templates::list_templates))
        .route("/signatures", get(handlers::signatures::list_signatures))
        .route(
            "/relationship-actions",
            get(handlers::relationship_actions::list_actions),
        )
        .route(
            "/relationship-actions/propose",
            post(handlers::relationship_actions::propose_draft),
        )
        .route("/search", get(handlers::search::search))
        .route("/pipeline-summary", get(handlers::search::pipeline_summary))
        .route(
            "/overdue-followups",
            get(handlers::search::overdue_followups),
        )
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::auth_middleware,
        ));

    Router::new()
        .nest("/api/v1", api_routes.merge(sse_routes))
        .with_state(state)
}
