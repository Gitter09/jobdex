//! External authority tests through the real router.
//!
//! One in-memory migrated pool per test, a fake bearer key in settings and a
//! loopback-free `Router::oneshot` call. No keychain, provider or real CRM data.

use std::collections::HashMap;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use axum::Router;
use jobdex_core::relationship_agent::AccessMode;
use serde_json::{json, Value};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;
use tokio::sync::RwLock;
use tower::ServiceExt;

use super::{routes, AppState};

const API_KEY: &str = "test-bearer-key";
const ALEX: &str = "alex-1";
const BLAIR: &str = "blair-2";

struct TestApi {
    pool: SqlitePool,
    app: Router,
}

impl TestApi {
    async fn new() -> Self {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("open in-memory sqlite");
        sqlx::migrate!("../src-core/migrations")
            .run(&pool)
            .await
            .expect("apply migrations");

        set_setting(&pool, "api_enabled", "true").await;
        set_setting(&pool, "api_key", API_KEY).await;

        // Seeded canonical statuses come from the real migrations.
        add_contact(
            &pool,
            ALEX,
            "Alex",
            "alex@example.com",
            "stat-new",
            "Owner's private summary",
        )
        .await;
        add_contact(
            &pool,
            BLAIR,
            "Blair",
            "blair@hidden.test",
            "stat-new",
            "Blair private summary",
        )
        .await;

        add_account(&pool, "acct-1", "sender@example.com", "super-secret-token").await;
        add_message(
            &pool,
            "thread-alex",
            ALEX,
            "msg-alex",
            "alex@example.com",
            "ALEX-ONLY-BODY",
        )
        .await;
        add_message(
            &pool,
            "thread-blair",
            BLAIR,
            "msg-blair",
            "blair@hidden.test",
            "BLAIR-SECRET-BODY",
        )
        .await;

        let state = AppState {
            pool: pool.clone(),
            sse_sessions: Arc::new(RwLock::new(HashMap::new())),
        };
        Self {
            pool,
            app: routes::create_router(state),
        }
    }

    async fn request(
        &self,
        method: Method,
        uri: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> (StatusCode, String) {
        let mut builder = Request::builder().method(method).uri(uri);
        if let Some(token) = token {
            builder = builder.header("authorization", format!("Bearer {}", token));
        }
        let body = match body {
            Some(value) => {
                builder = builder.header("content-type", "application/json");
                Body::from(value.to_string())
            }
            None => Body::empty(),
        };

        let response = self
            .app
            .clone()
            .oneshot(builder.body(body).expect("build request"))
            .await
            .expect("router response");
        let status = response.status();
        let bytes = axum::body::to_bytes(response.into_body(), 4 * 1024 * 1024)
            .await
            .expect("read response body");
        (status, String::from_utf8_lossy(&bytes).to_string())
    }

    async fn authed(
        &self,
        method: Method,
        uri: &str,
        body: Option<Value>,
    ) -> (StatusCode, String) {
        self.request(method, uri, Some(API_KEY), body).await
    }
}

#[tokio::test]
async fn requires_bearer_and_limits_reads_to_selected_scope() {
    let api = TestApi::new().await;

    let (status, _) = api.request(Method::GET, "/api/v1/contacts", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Bearer keys carry no implicit access: default scope is empty.
    let (status, body) = api.authed(Method::GET, "/api/v1/contacts", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json_body(&body)["data"], json!([]));

    store_scope(&api.pool, AccessMode::Read, &[ALEX], false).await;

    let (status, body) = api.authed(Method::GET, "/api/v1/contacts", None).await;
    assert_eq!(status, StatusCode::OK);
    let data = json_body(&body)["data"].clone();
    assert_eq!(data.as_array().expect("contact list").len(), 1);
    assert_eq!(data[0]["id"], ALEX);
    assert!(!body.contains(BLAIR));

    let (status, body) = api.authed(Method::GET, "/api/v1/contacts/blair-2", None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(json_body(&body)["error"]["code"], "NOT_FOUND");
    assert!(!body.contains("Blair private summary"));
    assert!(!body.contains("blair@hidden.test"));

    // Scoped message reads never include the hidden contact's body.
    let (status, all) = api.authed(Method::GET, "/api/v1/emails", None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(all.contains("ALEX-ONLY-BODY"));
    assert!(!all.contains("BLAIR-SECRET-BODY"));
    assert!(!all.contains("thread-blair"));

    let (status, alex_mail) = api
        .authed(Method::GET, "/api/v1/contacts/alex-1/emails", None)
        .await;
    assert_eq!(status, StatusCode::OK);
    assert!(alex_mail.contains("ALEX-ONLY-BODY"));
    assert!(!alex_mail.contains("BLAIR-SECRET-BODY"));

    let (status, hidden_mail) = api
        .authed(Method::GET, "/api/v1/contacts/blair-2/emails", None)
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(!hidden_mail.contains("BLAIR-SECRET-BODY"));
}

#[tokio::test]
async fn editing_a_scoped_address_cannot_expose_another_contacts_messages() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Organize, &[ALEX], false).await;
    let (status, _) = api.authed(
        Method::PATCH,
        "/api/v1/contacts/alex-1",
        Some(json!({ "email": "blair@hidden.test" })),
    ).await;
    assert_eq!(status, StatusCode::OK);

    let (status, messages) = api.authed(
        Method::GET, "/api/v1/contacts/alex-1/emails", None,
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert!(!messages.contains("BLAIR-SECRET-BODY"), "address edits must not expand message authority");
    assert!(messages.contains("ALEX-ONLY-BODY"), "existing thread ownership survives address edits");
}

#[tokio::test]
async fn read_mode_rejects_scoped_mutation() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Read, &[ALEX], false).await;

    let (status, body) = api
        .authed(
            Method::PATCH,
            "/api/v1/contacts/alex-1",
            Some(json!({ "company": "Hijacked Co" })),
        )
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(json_body(&body)["error"]["code"], "FORBIDDEN");

    let company: String = sqlx::query_scalar("SELECT company FROM contacts WHERE id = ?")
        .bind(ALEX)
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert_eq!(company, "Original Co");
}

#[tokio::test]
async fn organize_mode_permits_scoped_edit_and_audits_it() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Organize, &[ALEX], false).await;

    let (status, body) = api
        .authed(
            Method::PATCH,
            "/api/v1/contacts/alex-1",
            Some(json!({ "company": "Updated Co" })),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{}", body);
    assert_eq!(json_body(&body)["data"]["id"], ALEX);

    let company: String = sqlx::query_scalar("SELECT company FROM contacts WHERE id = ?")
        .bind(ALEX)
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert_eq!(company, "Updated Co");

    let detail: Option<String> = sqlx::query_scalar(
        "SELECT detail_json FROM relationship_activity WHERE contact_id = ? AND event_type = 'contact_updated_externally' ORDER BY created_at DESC LIMIT 1",
    )
    .bind(ALEX)
    .fetch_optional(&api.pool)
    .await
    .unwrap();
    let detail: Value = serde_json::from_str(&detail.expect("audit row")).unwrap();
    assert_eq!(detail["origin"], "api");
    let changed = detail["changedFields"].as_array().expect("changed fields");
    assert!(changed.iter().any(|field| field.as_str() == Some("company")));
}

#[tokio::test]
async fn organize_mode_rejects_protected_fields_hidden_contacts_and_bulk_scope() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Organize, &[ALEX], false).await;

    // The user-written summary is native-only.
    let (status, body) = api
        .authed(
            Method::PATCH,
            "/api/v1/contacts/alex-1",
            Some(json!({ "summary": "Attacker overwrite" })),
        )
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(json_body(&body)["error"]["code"], "FORBIDDEN");
    let summary: String =
        sqlx::query_scalar("SELECT intelligence_summary FROM contacts WHERE id = ?")
            .bind(ALEX)
            .fetch_one(&api.pool)
            .await
            .unwrap();
    assert_eq!(summary, "Owner's private summary");

    // Out-of-scope contacts are indistinguishable from missing ones.
    let (status, _) = api
        .authed(
            Method::PATCH,
            "/api/v1/contacts/blair-2",
            Some(json!({ "company": "Hijacked Co" })),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let hidden_company: String = sqlx::query_scalar("SELECT company FROM contacts WHERE id = ?")
        .bind(BLAIR)
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert_eq!(hidden_company, "Original Co");

    // A mixed-scope bulk write rejects atomically: neither row changes.
    let (status, body) = api
        .authed(
            Method::POST,
            "/api/v1/contacts/bulk-status",
            Some(json!({ "ids": [ALEX, BLAIR], "status_id": "stat-contacted" })),
        )
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(json_body(&body)["error"]["code"], "FORBIDDEN");
    let rows: Vec<(String, String)> =
        sqlx::query_as("SELECT id, status_id FROM contacts WHERE id IN (?, ?) ORDER BY id")
            .bind(ALEX)
            .bind(BLAIR)
            .fetch_all(&api.pool)
            .await
            .unwrap();
    assert_eq!(
        rows,
        vec![
            (ALEX.to_string(), "stat-new".to_string()),
            (BLAIR.to_string(), "stat-new".to_string()),
        ]
    );

    // An event belonging to another contact cannot be edited through a scoped
    // contact path, even when both contact IDs are otherwise valid.
    add_event(&api.pool, "event-blair", BLAIR, "Blair private event").await;
    let (status, _) = api
        .authed(
            Method::PATCH,
            "/api/v1/contacts/alex-1/events/event-blair",
            Some(json!({ "title": "Hijacked event" })),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let event_title: String =
        sqlx::query_scalar("SELECT title FROM contact_events WHERE id = 'event-blair'")
            .fetch_one(&api.pool)
            .await
            .unwrap();
    assert_eq!(event_title, "Blair private event");
}

#[tokio::test]
async fn contact_creation_requires_permission_and_only_expands_api_scope() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Organize, &[ALEX], false).await;

    let body = json!({
        "firstName": "Casey",
        "lastName": "New",
        "email": "  New@Example.com ",
        "statusId": "stat-new"
    });

    let (status, response) = api
        .authed(Method::POST, "/api/v1/contacts", Some(body.clone()))
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(json_body(&response)["error"]["code"], "FORBIDDEN");

    store_scope(&api.pool, AccessMode::Organize, &[ALEX], true).await;

    let (status, response) = api
        .authed(Method::POST, "/api/v1/contacts", Some(body))
        .await;
    assert_eq!(status, StatusCode::OK, "{}", response);
    let created = json_body(&response)["data"]["id"]
        .as_str()
        .expect("created id")
        .to_string();

    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM contacts WHERE id = ?)")
        .bind(&created)
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert!(exists);

    // New external contacts join API scope only, never model disclosure consent.
    let scope_json: String =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'api.allowed_contact_ids'")
            .fetch_one(&api.pool)
            .await
            .unwrap();
    let scope: Vec<String> = serde_json::from_str(&scope_json).unwrap();
    assert!(scope.contains(&ALEX.to_string()));
    assert!(scope.contains(&created));

    let model_scope: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'agent.allowed_contact_ids'")
            .fetch_optional(&api.pool)
            .await
            .unwrap();
    let model_scope: Vec<String> = model_scope
        .as_deref()
        .and_then(|v| serde_json::from_str(v).ok())
        .unwrap_or_default();
    assert!(!model_scope.contains(&created));
    assert!(!model_scope.contains(&ALEX.to_string()));

    // A duplicate normalized email is rejected without naming the hidden owner.
    let (status, duplicate) = api
        .authed(
            Method::POST,
            "/api/v1/contacts",
            Some(json!({
                "firstName": "Shadow",
                "lastName": "Copy",
                "email": "blair@hidden.test",
                "statusId": "stat-new"
            })),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json_body(&duplicate)["error"]["code"], "VALIDATION");
    assert!(!duplicate.contains(BLAIR));
    assert!(!duplicate.contains("Blair"));
    assert!(!duplicate.contains("blair@hidden.test"));

    let created_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM contacts")
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert_eq!(created_count, 3);
}

#[tokio::test]
async fn consequential_routes_and_remote_approval_are_absent() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Organize, &[ALEX], true).await;

    add_action(&api.pool, "action-1", ALEX).await;

    let attempts = [
        (Method::DELETE, "/api/v1/contacts/alex-1", StatusCode::METHOD_NOT_ALLOWED),
        (Method::POST, "/api/v1/emails", StatusCode::METHOD_NOT_ALLOWED),
        (Method::POST, "/api/v1/emails/scheduled", StatusCode::METHOD_NOT_ALLOWED),
        (Method::GET, "/api/v1/export", StatusCode::NOT_FOUND),
        (Method::GET, "/api/v1/settings", StatusCode::NOT_FOUND),
        (
            Method::POST,
            "/api/v1/relationship-actions/action-1/approve",
            StatusCode::NOT_FOUND,
        ),
    ];
    for (method, uri, expected) in attempts {
        let (status, body) = api
            .authed(method.clone(), uri, Some(json!({ "decision": "approve" })))
            .await;
        assert_eq!(status, expected, "{} {} -> {}", method, uri, body);
    }

    let contacts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM contacts")
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert_eq!(contacts, 2);
    let scheduled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM scheduled_emails")
        .fetch_one(&api.pool)
        .await
        .unwrap();
    assert_eq!(scheduled, 0);

    let action: (String, Option<String>) =
        sqlx::query_as("SELECT status, approved_at FROM relationship_actions WHERE id = 'action-1'")
            .fetch_one(&api.pool)
            .await
            .unwrap();
    assert_eq!(action, ("needs_review".to_string(), None));
}

#[tokio::test]
async fn external_draft_requires_native_review_and_hides_secrets() {
    let api = TestApi::new().await;
    store_scope(&api.pool, AccessMode::Organize, &[ALEX], false).await;

    let propose = json!({
        "contactId": ALEX,
        "payload": {
            "accountId": "acct-1",
            "to": "alex@example.com",
            "subject": "Catching up",
            "body": "Short note."
        }
    });
    let (status, response) = api
        .authed(Method::POST, "/api/v1/relationship-actions/propose", Some(propose))
        .await;
    assert_eq!(status, StatusCode::OK, "{}", response);
    let data = json_body(&response)["data"].clone();
    let id = data["id"].as_str().expect("draft id").to_string();
    assert_eq!(data["contactId"], ALEX);
    assert_eq!(data["kind"], "email_draft");
    assert_eq!(data["status"], "needs_review");
    assert_eq!(data["approvedAt"], Value::Null);
    assert_eq!(data["sendStartedAt"], Value::Null);
    assert_eq!(data["providerReceipt"], Value::Null);

    let persisted: (String, Option<String>, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT status, approved_at, send_started_at, provider_receipt FROM relationship_actions WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&api.pool)
    .await
    .unwrap();
    assert_eq!(persisted, ("needs_review".to_string(), None, None, None));

    // A draft to anyone other than the contact's current address is rejected.
    let (status, mismatch) = api
        .authed(
            Method::POST,
            "/api/v1/relationship-actions/propose",
            Some(json!({
                "contactId": ALEX,
                "payload": {
                    "accountId": "acct-1",
                    "to": "attacker@example.com",
                    "subject": "Catching up",
                    "body": "Short note."
                }
            })),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json_body(&mismatch)["error"]["code"], "VALIDATION");

    let (status, listed) = api
        .authed(Method::GET, "/api/v1/relationship-actions", None)
        .await;
    assert_eq!(status, StatusCode::OK);
    assert!(listed.contains(&id));

    // Account metadata never carries tokens or secret columns.
    let (status, accounts) = api.authed(Method::GET, "/api/v1/email-accounts", None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(accounts.contains("acct-1"));
    for secret in [
        "super-secret-token",
        "accessToken",
        "access_token",
        "refreshToken",
        "refresh_token",
    ] {
        assert!(!accounts.contains(secret), "leaked {secret}");
        assert!(!listed.contains(secret), "leaked {secret}");
    }
}

// ===== Harness helpers =====

async fn set_setting(pool: &SqlitePool, key: &str, value: &str) {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await
    .unwrap();
}

async fn store_scope(
    pool: &SqlitePool,
    access: AccessMode,
    contacts: &[&str],
    allow_create: bool,
) {
    let ids: Vec<String> = contacts.iter().map(|id| id.to_string()).collect();
    jobdex_core::relationship_agent::store::save_api_scope(pool, access, &ids, allow_create)
        .await
        .expect("save api scope");
}

async fn add_contact(
    pool: &SqlitePool,
    id: &str,
    first: &str,
    email: &str,
    status_id: &str,
    summary: &str,
) {
    sqlx::query(
        "INSERT INTO contacts (id, first_name, last_name, email, company, intelligence_summary, status_id, created_at, updated_at)
         VALUES (?, ?, 'Person', ?, 'Original Co', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(id)
    .bind(first)
    .bind(email)
    .bind(summary)
    .bind(status_id)
    .execute(pool)
    .await
    .unwrap();
}

async fn add_account(pool: &SqlitePool, id: &str, email: &str, access_token: &str) {
    sqlx::query(
        "INSERT INTO email_accounts (id, provider, email, access_token, refresh_token, created_at, updated_at)
         VALUES (?, 'gmail', ?, ?, 'refresh-secret-token', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(id)
    .bind(email)
    .bind(access_token)
    .execute(pool)
    .await
    .unwrap();
}

async fn add_message(
    pool: &SqlitePool,
    thread_id: &str,
    contact_id: &str,
    message_id: &str,
    address: &str,
    body: &str,
) {
    sqlx::query(
        "INSERT INTO email_threads (id, contact_id, account_id, subject, last_message_at)
         VALUES (?, ?, 'acct-1', 'Subject', CURRENT_TIMESTAMP)",
    )
    .bind(thread_id)
    .bind(contact_id)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO email_messages (id, thread_id, from_email, to_email, subject, body, sent_at, status, provider_message_id, created_at)
         VALUES (?, ?, ?, ?, 'Subject', ?, CURRENT_TIMESTAMP, 'received', ?, CURRENT_TIMESTAMP)",
    )
    .bind(message_id)
    .bind(thread_id)
    .bind(address)
    .bind(address)
    .bind(body)
    .bind(message_id)
    .execute(pool)
    .await
    .unwrap();
}

async fn add_event(pool: &SqlitePool, id: &str, contact_id: &str, title: &str) {
    sqlx::query(
        "INSERT INTO contact_events (id, contact_id, title, event_at, event_type, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'user_event', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(id)
    .bind(contact_id)
    .bind(title)
    .execute(pool)
    .await
    .unwrap();
}

async fn add_action(pool: &SqlitePool, id: &str, contact_id: &str) {
    sqlx::query(
        "INSERT INTO relationship_actions (id, workflow_id, contact_id, kind, status, payload_json, evidence_json, context_hash, revision, dedupe_key, created_at, updated_at)
         VALUES (?, NULL, ?, 'email_draft', 'needs_review', '{}', '{}', 'hash', 1, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
    )
    .bind(id)
    .bind(contact_id)
    .bind(format!("test:{}", id))
    .execute(pool)
    .await
    .unwrap();
}

fn json_body(body: &str) -> Value {
    serde_json::from_str(body).expect("json response body")
}
