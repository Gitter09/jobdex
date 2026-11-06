use axum::{
    extract::{Query, State},
    response::sse::{Event, KeepAlive, Sse},
    response::IntoResponse,
    Json,
};
use futures::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use crate::api::AppState;

type SseEvent = Result<Event, std::convert::Infallible>;
pub type SessionMap = Arc<RwLock<HashMap<String, mpsc::UnboundedSender<SseEvent>>>>;

const INVALID_PARAMS: i64 = -32602;
const METHOD_NOT_FOUND: i64 = -32601;
const INTERNAL_ERROR: i64 = -32000;

#[derive(Deserialize)]
pub struct MessageQuery {
    pub session_id: String,
}

pub async fn sse_handler(
    State(state): State<AppState>,
) -> Sse<impl futures::Stream<Item = SseEvent>> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let (tx, mut rx) = mpsc::unbounded_channel::<SseEvent>();

    let sessions = state.sse_sessions.clone();
    sessions.write().await.insert(session_id.clone(), tx);

    #[cfg(debug_assertions)]
    println!("[API] SSE session created: {}", session_id);

    let endpoint_url = format!("/api/v1/sse/message?sessionId={}", session_id);
    let endpoint_event: SseEvent = Ok(Event::default().event("endpoint").data(endpoint_url));

    let cleanup_id = session_id.clone();
    let cleanup_sessions = sessions.clone();

    let stream = async_stream::stream! {
        yield endpoint_event;
        while let Some(event) = rx.recv().await {
            yield event;
        }
        cleanup_sessions.write().await.remove(&cleanup_id);
        #[cfg(debug_assertions)]
        println!("[API] SSE session cleaned up: {}", cleanup_id);
    };

    Sse::new(stream.boxed()).keep_alive(KeepAlive::default())
}

pub async fn sse_message_handler(
    State(state): State<AppState>,
    Query(query): Query<MessageQuery>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let session_id = query.session_id;

    let sessions = state.sse_sessions.clone();
    let tx = match sessions.read().await.get(&session_id) {
        Some(tx) => tx.clone(),
        None => {
            #[cfg(debug_assertions)]
            eprintln!("[API Error] SSE session not found: {}", session_id);
            return (
                axum::http::StatusCode::NOT_FOUND,
                "Session not found or expired",
            )
                .into_response();
        }
    };

    let response = handle_json_rpc(body, &state).await;

    if response.is_empty() {
        return axum::http::StatusCode::ACCEPTED.into_response();
    }

    let event: SseEvent = Ok(Event::default().data(&response));
    if tx.send(event).is_err() {
        sessions.write().await.remove(&session_id);
        #[cfg(debug_assertions)]
        eprintln!(
            "[API Error] SSE session disconnected, removed: {}",
            session_id
        );
    }

    axum::http::StatusCode::ACCEPTED.into_response()
}

async fn handle_json_rpc(request: Value, state: &AppState) -> String {
    let method = request["method"].as_str().unwrap_or("");
    let id = request.get("id").cloned();

    match method {
        "initialize" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": { "tools": {} },
                "serverInfo": { "name": "jobdex-mcp", "version": "0.1.0" }
            }
        })
        .to_string(),

        "notifications/initialized" => String::new(),

        "tools/list" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": { "tools": get_tool_definitions() }
        })
        .to_string(),

        "tools/call" => {
            let tool_name = request["params"]["name"].as_str().unwrap_or("");
            let arguments = &request["params"]["arguments"];

            match dispatch_tool(tool_name, arguments) {
                Err(message) => json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "error": { "code": INVALID_PARAMS, "message": message }
                }),
                Ok(call) => match execute_tool(call, state).await {
                    Ok(result) => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": result
                    }),
                    Err(message) => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": { "code": INTERNAL_ERROR, "message": message }
                    }),
                },
            }
            .to_string()
        }

        _ => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": { "code": METHOD_NOT_FOUND, "message": "Method not found" }
        })
        .to_string(),
    }
}

#[derive(Clone, Copy)]
enum Method {
    Get,
    Post,
    Patch,
    Delete,
}

struct ApiCall {
    method: Method,
    url: String,
    body: Option<Value>,
}

fn arg<'a>(args: &'a Value, key: &str) -> Option<&'a str> {
    args.get(key).and_then(|v| v.as_str())
}

fn required<'a>(args: &'a Value, key: &str) -> Result<&'a str, String> {
    arg(args, key).ok_or_else(|| format!("Missing required argument: {}", key))
}

/// Only the REST bodies' real field names are forwarded.
fn contact_body(args: &Value, keys: &[&str]) -> Value {
    let mut map = serde_json::Map::new();
    for key in keys {
        if let Some(value) = args.get(*key) {
            if !value.is_null() {
                map.insert((*key).to_string(), value.clone());
            }
        }
    }
    Value::Object(map)
}

fn event_body(args: &Value) -> Value {
    contact_body(args, &["title", "description", "eventAt"])
}

fn urlencode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

/// Mirrors the stdio relay's tool set; both surfaces must stay identical.
fn dispatch_tool(name: &str, args: &Value) -> Result<ApiCall, String> {
    let base = "/api/v1";
    let get = |path: String| ApiCall {
        method: Method::Get,
        url: path,
        body: None,
    };

    match name {
        "list_contacts" => {
            let mut url = format!("{}/contacts", base);
            let mut params: Vec<String> = Vec::new();
            for key in ["status_id", "tag", "search"] {
                if let Some(value) = arg(args, key) {
                    params.push(format!("{}={}", key, urlencode(value)));
                }
            }
            if !params.is_empty() {
                url.push('?');
                url.push_str(&params.join("&"));
            }
            Ok(get(url))
        }
        "get_contact" => Ok(get(format!("/contacts/{}", required(args, "id")?))),
        "create_contact" => Ok(ApiCall {
            method: Method::Post,
            url: "/contacts".to_string(),
            body: Some(contact_body(
                args,
                &[
                    "firstName",
                    "lastName",
                    "email",
                    "linkedinUrl",
                    "statusId",
                    "title",
                    "company",
                    "location",
                    "companyWebsite",
                ],
            )),
        }),
        "update_contact" => Ok(ApiCall {
            method: Method::Patch,
            url: format!("/contacts/{}", required(args, "id")?),
            body: Some(contact_body(
                args,
                &[
                    "firstName",
                    "lastName",
                    "email",
                    "linkedinUrl",
                    "statusId",
                    "lastContactedDate",
                    "nextContactDate",
                    "cadenceStage",
                    "title",
                    "company",
                    "location",
                    "companyWebsite",
                ],
            )),
        }),
        "bulk_update_status" => Ok(ApiCall {
            method: Method::Post,
            url: "/contacts/bulk-status".to_string(),
            body: Some(json!({
                "ids": args.get("ids").cloned().unwrap_or_else(|| json!([])),
                "status_id": args.get("status_id").cloned().unwrap_or(Value::Null),
            })),
        }),
        "assign_tag" | "unassign_tag" => {
            let contact_id = required(args, "contact_id")?;
            let tag_id = required(args, "tag_id")?;
            Ok(ApiCall {
                method: if name == "assign_tag" {
                    Method::Post
                } else {
                    Method::Delete
                },
                url: format!("/contacts/{}/tags/{}", contact_id, tag_id),
                body: None,
            })
        }
        "create_contact_event" => Ok(ApiCall {
            method: Method::Post,
            url: format!("/contacts/{}/events", required(args, "contact_id")?),
            body: Some(event_body(args)),
        }),
        "update_contact_event" => {
            let contact_id = required(args, "contact_id")?;
            let event_id = required(args, "event_id")?;
            Ok(ApiCall {
                method: Method::Patch,
                url: format!("/contacts/{}/events/{}", contact_id, event_id),
                body: Some(event_body(args)),
            })
        }
        "list_emails_for_contact" => Ok(get(format!(
            "/contacts/{}/emails",
            required(args, "contact_id")?
        ))),
        "get_contact_activity" => Ok(get(format!(
            "/contacts/{}/activity",
            required(args, "contact_id")?
        ))),
        "search_contacts" => Ok(get(format!(
            "/search?q={}",
            urlencode(required(args, "q")?)
        ))),
        "list_statuses" => Ok(get("/statuses".to_string())),
        "list_tags" => Ok(get("/tags".to_string())),
        "list_templates" => Ok(get("/templates".to_string())),
        "list_signatures" => Ok(get("/signatures".to_string())),
        "list_email_accounts" => Ok(get("/email-accounts".to_string())),
        "list_relationship_actions" => Ok(get("/relationship-actions".to_string())),
        "propose_relationship_email" => Ok(ApiCall {
            method: Method::Post,
            url: "/relationship-actions/propose".to_string(),
            body: Some(json!({
                "contactId": required(args, "contactId")?,
                "payload": args.get("payload").cloned().unwrap_or(Value::Null),
            })),
        }),
        "get_pipeline_summary" => Ok(get("/pipeline-summary".to_string())),
        "get_overdue_followups" => Ok(get("/overdue-followups".to_string())),
        _ => Err(format!("Unknown tool: {}", name)),
    }
}

async fn execute_tool(call: ApiCall, state: &AppState) -> Result<Value, String> {
    let api_key = get_api_key(&state.pool)
        .await
        .ok_or("API key not configured")?;
    let port = get_api_port(&state.pool).await;
    let base = format!("http://127.0.0.1:{}", port);
    let url = format!("{}{}", base, call.url);
    let client = reqwest::Client::new();

    let mut request = match call.method {
        Method::Get => client.get(&url),
        Method::Post => client.post(&url),
        Method::Patch => client.patch(&url),
        Method::Delete => client.delete(&url),
    }
    .header("Authorization", format!("Bearer {}", api_key));

    if let Some(body) = &call.body {
        request = request
            .header("Content-Type", "application/json")
            .json(body);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .unwrap_or_else(|e| format!("Error reading response: {}", e));

    let mut result = json!({
        "content": [{ "type": "text", "text": text }]
    });
    if !status.is_success() {
        result["isError"] = json!(true);
    }
    Ok(result)
}

async fn get_api_key(pool: &sqlx::SqlitePool) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = 'api_key'")
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

async fn get_api_port(pool: &sqlx::SqlitePool) -> u16 {
    sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = 'api_port'")
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .and_then(|v| v.parse().ok())
        .unwrap_or(13420)
}

fn get_tool_definitions() -> Vec<Value> {
    vec![
        json!({
            "name": "list_contacts",
            "description": "List people you have allowed this API key to see. Optionally filter by status ID, tag name, or a search term.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "status_id": { "type": "string", "description": "Filter by status ID." },
                    "tag": { "type": "string", "description": "Filter by tag name." },
                    "search": { "type": "string", "description": "Search across name, email, company, and title." }
                }
            }
        }),
        json!({
            "name": "get_contact",
            "description": "Get one permitted contact with tags and status.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "The contact ID." }
                },
                "required": ["id"]
            }
        }),
        json!({
            "name": "create_contact",
            "description": "Add a person. Requires organize access and contact-creation permission in JobDex. The new contact joins API scope only.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "firstName": { "type": "string", "description": "Given name." },
                    "lastName": { "type": "string", "description": "Family name." },
                    "email": { "type": "string", "description": "Email address." },
                    "linkedinUrl": { "type": "string", "description": "LinkedIn profile URL." },
                    "statusId": { "type": "string", "description": "Status ID." },
                    "title": { "type": "string", "description": "Job title." },
                    "company": { "type": "string", "description": "Company." },
                    "location": { "type": "string", "description": "City or region." },
                    "companyWebsite": { "type": "string", "description": "Company website URL." }
                },
                "required": ["firstName", "lastName"]
            }
        }),
        json!({
            "name": "update_contact",
            "description": "Update identity and profile fields of a permitted contact. The user-written summary cannot be changed here.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "firstName": { "type": "string" },
                    "lastName": { "type": "string" },
                    "email": { "type": "string" },
                    "linkedinUrl": { "type": "string" },
                    "statusId": { "type": "string" },
                    "lastContactedDate": { "type": "string", "description": "ISO 8601 datetime." },
                    "nextContactDate": { "type": "string", "description": "ISO 8601 datetime." },
                    "cadenceStage": { "type": "integer" },
                    "title": { "type": "string" },
                    "company": { "type": "string" },
                    "location": { "type": "string" },
                    "companyWebsite": { "type": "string" }
                },
                "required": ["id"]
            }
        }),
        json!({
            "name": "bulk_update_status",
            "description": "Move several permitted contacts to one status. Fails without writes if any ID is out of scope.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ids": { "type": "array", "items": { "type": "string" } },
                    "status_id": { "type": "string" }
                },
                "required": ["ids", "status_id"]
            }
        }),
        json!({
            "name": "assign_tag",
            "description": "Assign an existing tag to a permitted contact.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "contact_id": { "type": "string" },
                    "tag_id": { "type": "string" }
                },
                "required": ["contact_id", "tag_id"]
            }
        }),
        json!({
            "name": "unassign_tag",
            "description": "Remove a tag from a permitted contact.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "contact_id": { "type": "string" },
                    "tag_id": { "type": "string" }
                },
                "required": ["contact_id", "tag_id"]
            }
        }),
        json!({
            "name": "create_contact_event",
            "description": "Add a user event to a permitted contact's timeline.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "contact_id": { "type": "string" },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "eventAt": { "type": "string", "description": "ISO 8601 datetime." }
                },
                "required": ["contact_id", "title"]
            }
        }),
        json!({
            "name": "update_contact_event",
            "description": "Edit a user event that belongs to a permitted contact.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "contact_id": { "type": "string" },
                    "event_id": { "type": "string" },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "eventAt": { "type": "string", "description": "ISO 8601 datetime." }
                },
                "required": ["contact_id", "event_id"]
            }
        }),
        json!({
            "name": "list_emails_for_contact",
            "description": "Get synced messages for a permitted contact.",
            "inputSchema": {
                "type": "object",
                "properties": { "contact_id": { "type": "string" } },
                "required": ["contact_id"]
            }
        }),
        json!({
            "name": "get_contact_activity",
            "description": "Get the activity timeline for a permitted contact.",
            "inputSchema": {
                "type": "object",
                "properties": { "contact_id": { "type": "string" } },
                "required": ["contact_id"]
            }
        }),
        json!({
            "name": "search_contacts",
            "description": "Search permitted contacts by name, email, company, or title. Also searches tags.",
            "inputSchema": {
                "type": "object",
                "properties": { "q": { "type": "string", "description": "Search query." } },
                "required": ["q"]
            }
        }),
        json!({
            "name": "list_statuses",
            "description": "Get status definitions. Read-only externally.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "list_tags",
            "description": "Get tag definitions. Read-only externally.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "list_templates",
            "description": "Get email templates. Read-only externally.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "list_signatures",
            "description": "Get email signatures. Read-only externally.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "list_email_accounts",
            "description": "Get connected email accounts as id, provider, address and last sync time.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "list_relationship_actions",
            "description": "Get relationship actions for permitted contacts. Read-only: sending happens only after native approval.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "propose_relationship_email",
            "description": "Propose an email draft for a permitted contact. The draft waits for the user's explicit approval in JobDex; it is never sent from here.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "contactId": { "type": "string" },
                    "payload": {
                        "type": "object",
                        "properties": {
                            "accountId": { "type": "string" },
                            "to": { "type": "string" },
                            "subject": { "type": "string" },
                            "body": { "type": "string" }
                        },
                        "required": ["accountId", "to", "subject", "body"]
                    }
                },
                "required": ["contactId", "payload"]
            }
        }),
        json!({
            "name": "get_pipeline_summary",
            "description": "Get counts of permitted contacts per status.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
        json!({
            "name": "get_overdue_followups",
            "description": "Get permitted contacts whose next follow-up date has passed.",
            "inputSchema": { "type": "object", "properties": {} }
        }),
    ]
}
