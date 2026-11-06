use anyhow::Result;
use clap::Parser;
use serde_json::{json, Value};
use std::io::Write;
use tokio::io::AsyncBufReadExt;

#[derive(Parser, Debug)]
#[command(
    name = "jobdex-mcp",
    about = "JobDex MCP Server — stdio JSON-RPC relay"
)]
struct Args {
    #[arg(long, env = "JOBDEX_API_URL")]
    api_url: String,

    #[arg(long, env = "JOBDEX_API_KEY")]
    api_key: String,

    #[arg(long, default_value = "warn")]
    log_level: String,
}

/// JSON-RPC error codes used by this server.
const INVALID_PARAMS: i64 = -32602;
const METHOD_NOT_FOUND: i64 = -32601;
const INTERNAL_ERROR: i64 = -32000;

fn log_err(msg: &str) {
    let _ = std::io::stderr().write_all(format!("[MCP Error] {}\n", msg).as_bytes());
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

fn dispatch(name: &str, args: &Value, base: &str) -> Result<ApiCall, String> {
    let get = |path: String| ApiCall {
        method: Method::Get,
        url: path,
        body: None,
    };

    match name {
        "list_contacts" => {
            let mut url = format!("{}/api/v1/contacts", base);
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
        "get_contact" => Ok(get(format!(
            "{}/api/v1/contacts/{}",
            base,
            required(args, "id")?
        ))),
        "create_contact" => Ok(ApiCall {
            method: Method::Post,
            url: format!("{}/api/v1/contacts", base),
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
        "update_contact" => {
            let id = required(args, "id")?;
            Ok(ApiCall {
                method: Method::Patch,
                url: format!("{}/api/v1/contacts/{}", base, id),
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
            })
        }
        "bulk_update_status" => Ok(ApiCall {
            method: Method::Post,
            url: format!("{}/api/v1/contacts/bulk-status", base),
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
                url: format!(
                    "{}/api/v1/contacts/{}/tags/{}",
                    base, contact_id, tag_id
                ),
                body: None,
            })
        }
        "create_contact_event" => Ok(ApiCall {
            method: Method::Post,
            url: format!(
                "{}/api/v1/contacts/{}/events",
                base,
                required(args, "contact_id")?
            ),
            body: Some(event_body(args)),
        }),
        "update_contact_event" => {
            let contact_id = required(args, "contact_id")?;
            let event_id = required(args, "event_id")?;
            Ok(ApiCall {
                method: Method::Patch,
                url: format!(
                    "{}/api/v1/contacts/{}/events/{}",
                    base, contact_id, event_id
                ),
                body: Some(event_body(args)),
            })
        }
        "list_emails_for_contact" => Ok(get(format!(
            "{}/api/v1/contacts/{}/emails",
            base,
            required(args, "contact_id")?
        ))),
        "get_contact_activity" => Ok(get(format!(
            "{}/api/v1/contacts/{}/activity",
            base,
            required(args, "contact_id")?
        ))),
        "search_contacts" => Ok(get(format!(
            "{}/api/v1/search?q={}",
            base,
            urlencode(required(args, "q")?)
        ))),
        "list_statuses" => Ok(get(format!("{}/api/v1/statuses", base))),
        "list_tags" => Ok(get(format!("{}/api/v1/tags", base))),
        "list_templates" => Ok(get(format!("{}/api/v1/templates", base))),
        "list_signatures" => Ok(get(format!("{}/api/v1/signatures", base))),
        "list_email_accounts" => Ok(get(format!("{}/api/v1/email-accounts", base))),
        "list_relationship_actions" => Ok(get(format!("{}/api/v1/relationship-actions", base))),
        "propose_relationship_email" => Ok(ApiCall {
            method: Method::Post,
            url: format!("{}/api/v1/relationship-actions/propose", base),
            body: Some(json!({
                "contactId": required(args, "contactId")?,
                "payload": args.get("payload").cloned().unwrap_or(Value::Null),
            })),
        }),
        "get_pipeline_summary" => Ok(get(format!("{}/api/v1/pipeline-summary", base))),
        "get_overdue_followups" => Ok(get(format!("{}/api/v1/overdue-followups", base))),
        _ => Err(format!("Unknown tool: {}", name)),
    }
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

async fn call_tool(
    client: &reqwest::Client,
    call: ApiCall,
    api_key: &str,
) -> Result<Value, String> {
    let mut request = match call.method {
        Method::Get => client.get(&call.url),
        Method::Post => client.post(&call.url),
        Method::Patch => client.patch(&call.url),
        Method::Delete => client.delete(&call.url),
    }
    .bearer_auth(api_key);

    if let Some(body) = &call.body {
        request = request.json(body);
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

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let base = args.api_url.trim_end_matches('/').to_string();

    #[cfg(debug_assertions)]
    eprintln!("[MCP] Starting jobdex-mcp, connecting to {}", base);

    let client = reqwest::Client::new();
    let stdin = tokio::io::BufReader::new(tokio::io::stdin());
    let mut lines = stdin.lines();

    loop {
        let line = match lines.next_line().await {
            Ok(Some(l)) => l,
            Ok(None) => break,
            Err(e) => {
                log_err(&format!("Error reading stdin: {}", e));
                break;
            }
        };

        let request: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                log_err(&format!("Invalid JSON-RPC: {}", e));
                continue;
            }
        };

        let is_notification = match &request {
            Value::Object(map) => !map.contains_key("id"),
            _ => false,
        };
        let method = request.get("method").and_then(|m| m.as_str()).unwrap_or("");

        if is_notification {
            continue;
        }

        let id = request.get("id").cloned();

        let response = match method {
            "initialize" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "jobdex-mcp", "version": "0.1.0" }
                }
            }),
            "tools/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": { "tools": get_tool_definitions() }
            }),
            "tools/call" => {
                let tool_name = request["params"]["name"].as_str().unwrap_or("");
                let arguments = &request["params"]["arguments"];

                #[cfg(debug_assertions)]
                eprintln!("[MCP] Calling tool: {}", tool_name);

                match dispatch(tool_name, arguments, &base) {
                    Ok(call) => match call_tool(&client, call, &args.api_key).await {
                        Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
                        Err(e) => {
                            log_err(&format!("{}", e));
                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "error": { "code": INTERNAL_ERROR, "message": e }
                            })
                        }
                    },
                    Err(message) => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": { "code": INVALID_PARAMS, "message": message }
                    }),
                }
            }
            _ => json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": { "code": METHOD_NOT_FOUND, "message": "Method not found" }
            }),
        };

        println!("{}", serde_json::to_string(&response)?);
        let _ = std::io::stdout().flush();
    }

    #[cfg(debug_assertions)]
    eprintln!("[MCP] Shutting down.");
    Ok(())
}
