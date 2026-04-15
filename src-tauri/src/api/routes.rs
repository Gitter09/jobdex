use crate::api::{auth, handlers, AppState};
use axum::{middleware, routing::*, Router};

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
            "/contacts/bulk-delete",
            post(handlers::contacts::bulk_delete_contacts),
        )
        .route(
            "/contacts/bulk-status",
            post(handlers::contacts::bulk_update_status),
        )
        .route(
            "/contacts/{id}",
            get(handlers::contacts::get_contact)
                .patch(handlers::contacts::update_contact)
                .delete(handlers::contacts::delete_contact),
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
            patch(handlers::events::update_event).delete(handlers::events::delete_event),
        )
        .route(
            "/contacts/{id}/activity",
            get(handlers::events::get_activity),
        )
        .route("/contacts/{id}/files", get(handlers::files::list_files))
        .route(
            "/contacts/{id}/files/{file_id}",
            delete(handlers::files::delete_file),
        )
        .route(
            "/statuses",
            get(handlers::statuses::list_statuses).post(handlers::statuses::create_status),
        )
        .route(
            "/statuses/reorder",
            post(handlers::statuses::reorder_statuses),
        )
        .route(
            "/statuses/{id}",
            patch(handlers::statuses::update_status).delete(handlers::statuses::delete_status),
        )
        .route(
            "/tags",
            get(handlers::tags::list_tags).post(handlers::tags::create_tag),
        )
        .route(
            "/tags/{id}",
            patch(handlers::tags::update_tag).delete(handlers::tags::delete_tag),
        )
        .route("/email-accounts", get(handlers::emails::list_accounts))
        .route(
            "/email-accounts/{id}",
            delete(handlers::emails::delete_account),
        )
        .route("/email-accounts/sync", post(handlers::emails::sync_all))
        .route(
            "/email-accounts/{id}/sync",
            post(handlers::emails::sync_account),
        )
        .route("/emails", get(handlers::emails::list_all))
        .route("/emails/send", post(handlers::emails::send_email))
        .route("/emails/schedule", post(handlers::emails::schedule_email))
        .route("/emails/scheduled", get(handlers::emails::list_scheduled))
        .route(
            "/emails/scheduled/{id}",
            patch(handlers::emails::update_scheduled).delete(handlers::emails::cancel_scheduled),
        )
        .route(
            "/templates",
            get(handlers::templates::list_templates).post(handlers::templates::upsert_template),
        )
        .route(
            "/templates/{id}",
            delete(handlers::templates::delete_template),
        )
        .route(
            "/signatures",
            get(handlers::signatures::list_signatures).post(handlers::signatures::upsert_signature),
        )
        .route(
            "/signatures/{id}",
            delete(handlers::signatures::delete_signature),
        )
        .route("/import/headers", post(handlers::import::get_headers))
        .route("/import/analyze", post(handlers::import::analyze))
        .route("/import/contacts", post(handlers::import::import_contacts))
        .route("/data/export", get(handlers::data::export_data))
        .route("/data/clear", post(handlers::data::clear_data))
        .route(
            "/settings",
            get(handlers::settings::get_settings).patch(handlers::settings::update_settings),
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
