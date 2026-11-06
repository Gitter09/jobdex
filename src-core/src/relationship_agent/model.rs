//! Model access: one concrete OpenAI-compatible chat-completions client, plus
//! the configuration, consent and request-budget bookkeeping around it.
//!
//! Deterministic code owns configuration, consent, time and budget. The model only
//! ever produces or interprets text.

use super::models::*;
use super::store;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

pub const SECRET_NAME: &str = "relationship_agent_api_key";
pub const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";
pub const DEFAULT_DAILY_LIMIT: i64 = 20;

pub(crate) static AUTHORITY: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

const K_BASE_URL: &str = "agent.base_url";
const K_MODEL: &str = "agent.model";
const K_ENABLED: &str = "agent.enabled";
const K_PAUSED: &str = "agent.paused";
const K_ALLOWED: &str = "agent.allowed_contact_ids";
const K_LIMIT: &str = "agent.daily_request_limit";
const K_USAGE_DATE: &str = "agent.usage_utc_date";
const K_USAGE_COUNT: &str = "agent.usage_request_count";
const K_VERIFIED: &str = "agent.verified_config_hash";
const K_LAST_ERROR: &str = "agent.last_error";
const K_PERMISSION_REVISION: &str = "agent.permission_revision";

// ===== Failure codes =====

/// A model failure with a stable code so callers can surface a blocked state
/// instead of inventing a fact.
#[derive(Debug)]
pub struct ModelFailure {
    pub code: &'static str,
    pub message: String,
}

impl std::fmt::Display for ModelFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ModelFailure {}

pub fn failure(code: &'static str, message: impl Into<String>) -> anyhow::Error {
    anyhow::Error::new(ModelFailure {
        code,
        message: message.into(),
    })
}

pub fn failure_code(err: &anyhow::Error) -> &'static str {
    err.downcast_ref::<ModelFailure>()
        .map(|f| f.code)
        .unwrap_or("MODEL_ERROR")
}

// ===== Settings =====

#[derive(Debug, Clone)]
pub struct AgentSettings {
    pub base_url: String,
    pub model: String,
    pub enabled: bool,
    pub paused: bool,
    pub daily_request_limit: i64,
    pub allowed_contact_ids: Vec<String>,
    pub verified_hash: String,
    pub usage_date: String,
    pub usage_count: i64,
    pub last_error: Option<String>,
}

async fn read(pool: &SqlitePool, key: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

async fn write(pool: &SqlitePool, key: &str, value: &str) -> Result<()> {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn load(pool: &SqlitePool) -> Result<AgentSettings> {
    let limit = read(pool, K_LIMIT)
        .await
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(DEFAULT_DAILY_LIMIT)
        .clamp(1, MAX_DAILY_REQUESTS);

    let allowed = read(pool, K_ALLOWED)
        .await
        .and_then(|v| serde_json::from_str::<Vec<String>>(&v).ok())
        .unwrap_or_default();

    Ok(AgentSettings {
        base_url: read(pool, K_BASE_URL)
            .await
            .filter(|v| !v.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
        model: read(pool, K_MODEL).await.unwrap_or_default(),
        enabled: read(pool, K_ENABLED).await.as_deref() == Some("true"),
        // Default paused: model work never starts without an explicit resume.
        paused: read(pool, K_PAUSED)
            .await
            .map(|v| v != "false")
            .unwrap_or(true),
        daily_request_limit: limit,
        allowed_contact_ids: allowed,
        verified_hash: read(pool, K_VERIFIED).await.unwrap_or_default(),
        usage_date: read(pool, K_USAGE_DATE).await.unwrap_or_default(),
        usage_count: read(pool, K_USAGE_COUNT)
            .await
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(0),
        last_error: read(pool, K_LAST_ERROR).await.filter(|v| !v.trim().is_empty()),
    })
}

pub fn is_consented(settings: &AgentSettings, contact_id: &str) -> bool {
    settings
        .allowed_contact_ids
        .iter()
        .any(|id| id == contact_id)
}

fn config_hash(base_url: &str, model: &str) -> String {
    store::sha256_hex(&format!("{}\n{}", base_url.trim(), model.trim()))
}

fn today_utc() -> String {
    chrono::Utc::now().format("%Y-%m-%d").to_string()
}

pub fn requests_today(settings: &AgentSettings) -> i64 {
    if settings.usage_date == today_utc() {
        settings.usage_count
    } else {
        0
    }
}

// ===== Status =====

pub async fn status(pool: &SqlitePool) -> Result<ModelStatus> {
    let settings = load(pool).await?;
    let hash = config_hash(&settings.base_url, &settings.model);
    let configured = !settings.model.trim().is_empty() && key_present().await?;
    let connection_verified = !settings.verified_hash.is_empty() && settings.verified_hash == hash;

    Ok(ModelStatus {
        configured,
        connection_verified,
        enabled: settings.enabled,
        paused: settings.paused,
        base_url: settings.base_url.clone(),
        model: settings.model.clone(),
        requests_today: requests_today(&settings),
        daily_request_limit: settings.daily_request_limit,
        allowed_contact_ids: settings.allowed_contact_ids.clone(),
        last_error: settings.last_error.clone(),
    })
}

/// True when the model may be called at all: key present, model chosen, connection
/// verified, enabled, not paused.
pub async fn ready_for_model_calls(pool: &SqlitePool) -> Result<bool> {
    let settings = load(pool).await?;
    Ok(model_ready(&settings) && key_present().await?)
}

pub fn model_ready(settings: &AgentSettings) -> bool {
    if !settings.enabled || settings.paused {
        return false;
    }
    if settings.model.trim().is_empty() {
        return false;
    }
    let hash = config_hash(&settings.base_url, &settings.model);
    !settings.verified_hash.is_empty() && settings.verified_hash == hash
}

// ===== Keychain =====

/// Test-only key. Production reads the OS keychain exclusively; the key is never
/// written to settings, logs or any wire type.
#[cfg(test)]
pub(crate) static TEST_KEY: std::sync::LazyLock<std::sync::RwLock<Option<String>>> =
    std::sync::LazyLock::new(|| std::sync::RwLock::new(None));

#[cfg(test)]
pub(crate) fn set_test_key(key: &str) {
    *TEST_KEY.write().unwrap() = Some(key.to_string());
}

pub async fn key_present() -> Result<bool> {
    #[cfg(test)]
    {
        tests::KEY_LOOKUPS.with(|reads| reads.set(reads.get() + 1));
        Ok(TEST_KEY.read().unwrap().is_some())
    }
    #[cfg(not(test))]
    { tokio::task::spawn_blocking(|| crate::crypto::get_secret(SECRET_NAME).is_ok())
        .await
        .map_err(|e| anyhow!("Keychain task failed: {}", e)) }
}

async fn store_key(key: String) -> Result<()> {
    tokio::task::spawn_blocking(move || crate::crypto::store_secret(SECRET_NAME, &key))
        .await
        .map_err(|e| anyhow!("Keychain task failed: {}", e))??;
    Ok(())
}

async fn load_key() -> Result<String> {
    #[cfg(test)]
    { TEST_KEY.read().unwrap().clone().ok_or_else(|| anyhow!("Test model key is not configured")) }
    #[cfg(not(test))]
    { tokio::task::spawn_blocking(|| crate::crypto::get_secret(SECRET_NAME))
        .await
        .map_err(|e| anyhow!("Keychain task failed: {}", e))?
        .map_err(|e| anyhow!("Model key is not configured: {}", e)) }
}

async fn remove_key() -> Result<()> {
    tokio::task::spawn_blocking(|| crate::crypto::remove_secret(SECRET_NAME))
        .await
        .map_err(|e| anyhow!("Keychain task failed: {}", e))??;
    Ok(())
}

// ===== Configuration =====

/// Validates an OpenAI-compatible base URL: HTTPS only, no credentials, query or
/// fragment, no trailing slash.
pub fn validate_base_url(raw: &str) -> Result<String> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Ok(String::new());
    }
    let parsed = url::Url::parse(trimmed)
        .map_err(|_| anyhow!("Base URL is not a valid URL"))?;
    if parsed.scheme() != "https" {
        return Err(anyhow!("Base URL must use HTTPS"));
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err(anyhow!("Base URL must not contain credentials"));
    }
    if parsed.query().is_some() {
        return Err(anyhow!("Base URL must not contain a query string"));
    }
    if parsed.fragment().is_some() {
        return Err(anyhow!("Base URL must not contain a fragment"));
    }
    if parsed.host_str().is_none() {
        return Err(anyhow!("Base URL must include a host"));
    }
    Ok(trimmed.to_string())
}

pub async fn configure(
    pool: &SqlitePool,
    config: RelationshipModelConfig,
    api_key: Option<String>,
) -> Result<ModelStatus> {
    let _authority = AUTHORITY.lock().await;
    if !(1..=MAX_DAILY_REQUESTS).contains(&config.daily_request_limit) {
        return Err(anyhow!(
            "Daily request limit must be between 1 and {}",
            MAX_DAILY_REQUESTS
        ));
    }

    let base_url = if config.base_url.trim().is_empty() {
        DEFAULT_BASE_URL.to_string()
    } else {
        validate_base_url(&config.base_url)?
    };
    let model = config.model.trim().to_string();
    if model.len() > 200 {
        return Err(anyhow!("Model identifier is too long"));
    }

    let mut allowed = Vec::new();
    for id in &config.allowed_contact_ids {
        let id = validate_id(id, "allowedContactIds")?;
        if !store::contact_exists(pool, &id).await? {
            return Err(anyhow!("Unknown contact in consent list: {}", id));
        }
        if !allowed.contains(&id) {
            allowed.push(id);
        }
    }

    let previous = load(pool).await?;
    let endpoint_changed = previous.base_url != base_url;
    let previous_hash = config_hash(&previous.base_url, &previous.model);
    let new_hash = config_hash(&base_url, &model);

    // A new host must never receive the old host's credential.
    if endpoint_changed {
        if let Some(key) = api_key.as_ref() {
            if key.trim().is_empty() {
                remove_key().await?;
            } else {
                store_key(key.trim().to_string()).await?;
            }
        } else {
            remove_key().await?;
        }
    } else if let Some(key) = api_key.as_ref() {
        if key.trim().is_empty() {
            remove_key().await?;
        } else {
            store_key(key.trim().to_string()).await?;
        }
    }

    write(pool, K_BASE_URL, &base_url).await?;
    write(pool, K_MODEL, &model).await?;
    write(pool, K_ENABLED, if config.enabled { "true" } else { "false" }).await?;
    write(
        pool,
        K_LIMIT,
        &config.daily_request_limit.to_string(),
    )
    .await?;
    write(pool, K_ALLOWED, &serde_json::to_string(&allowed)?).await?;
    for revoked in &previous.allowed_contact_ids {
        if !allowed.contains(revoked) {
            store::revoke_contact_consent(pool, revoked).await?;
        }
    }

    // Endpoint or model change invalidates the verification and the consent the
    // user gave under the old destination.
    if previous_hash != new_hash || endpoint_changed {
        write(pool, K_VERIFIED, "").await?;
        write(pool, K_LAST_ERROR, "").await?;
    }

    if previous_hash != new_hash
        || endpoint_changed
        || previous.allowed_contact_ids != allowed
        || previous.enabled != config.enabled
    {
        bump_permission_revision(pool).await?;
    }

    status(pool).await
}

pub async fn disconnect(pool: &SqlitePool) -> Result<()> {
    let _authority = AUTHORITY.lock().await;
    remove_key().await?;
    write(pool, K_ENABLED, "false").await?;
    write(pool, K_VERIFIED, "").await?;
    write(pool, K_LAST_ERROR, "").await?;
    bump_permission_revision(pool).await?;
    Ok(())
}

pub async fn set_paused(pool: &SqlitePool, paused: bool) -> Result<()> {
    let _authority = AUTHORITY.lock().await;
    write(pool, K_PAUSED, if paused { "true" } else { "false" }).await?;
    bump_permission_revision(pool).await?;
    if paused {
        // Pausing clears approvals: they were granted in a state that no longer holds.
        sqlx::query(
            "UPDATE relationship_actions SET status = 'needs_review', approved_at = NULL, approved_revision = NULL, updated_at = ? WHERE status = 'approved'",
        )
        .bind(now_iso())
        .execute(pool)
        .await?;
    }
    Ok(())
}

pub async fn permission_revision(pool: &SqlitePool) -> Result<i64> {
    Ok(read(pool, K_PERMISSION_REVISION)
        .await
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0))
}

pub async fn bump_permission_revision(pool: &SqlitePool) -> Result<i64> {
    let mut tx = pool.begin().await?;
    let current: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
            .bind(K_PERMISSION_REVISION)
            .fetch_optional(&mut *tx)
            .await?;
    let next = current.and_then(|v| v.parse::<i64>().ok()).unwrap_or(0) + 1;
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(K_PERMISSION_REVISION)
    .bind(next.to_string())
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(next)
}

/// Increments the UTC-day counter exactly once. Counts failures and connection
/// tests, because the provider bills those too.
pub async fn reserve_request(pool: &SqlitePool) -> Result<()> {
    let mut tx = pool.begin().await?;
    let limit: i64 = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(K_LIMIT)
        .fetch_optional(&mut *tx)
        .await?
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(DEFAULT_DAILY_LIMIT)
        .clamp(1, MAX_DAILY_REQUESTS);

    let stored_date: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
            .bind(K_USAGE_DATE)
            .fetch_optional(&mut *tx)
            .await?;
    let stored_count: i64 = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(K_USAGE_COUNT)
        .fetch_optional(&mut *tx)
        .await?
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);

    let today = today_utc();
    let effective = if stored_date.as_deref() == Some(today.as_str()) {
        stored_count
    } else {
        0
    };

    if effective >= limit {
        return Err(failure(
            "REQUEST_LIMIT",
            format!("Daily model request limit of {} reached", limit),
        ));
    }

    for (key, value) in [
        (K_USAGE_DATE, today.clone()),
        (K_USAGE_COUNT, (effective + 1).to_string()),
    ] {
        sqlx::query(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .bind(key)
        .bind(value)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn record_error(pool: &SqlitePool, message: &str) {
    let _ = write(pool, K_LAST_ERROR, &message.chars().take(300).collect::<String>()).await;
}

pub async fn clear_error(pool: &SqlitePool) {
    let _ = write(pool, K_LAST_ERROR, "").await;
}

// ===== Client =====

#[derive(Serialize)]
struct ChatMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct ResponseFormat<'a> {
    r#type: &'a str,
}

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage<'a>>,
    temperature: f32,
    max_tokens: u32,
    response_format: ResponseFormat<'a>,
}

#[derive(Deserialize)]
struct ChatResponse {
    #[serde(default)]
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    #[serde(default)]
    message: ChatResponseMessage,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Deserialize, Default)]
struct ChatResponseMessage {
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    refusal: Option<String>,
}

pub struct ModelClient {
    base_url: String,
    model: String,
    api_key: String,
    http: reqwest::Client,
}

impl ModelClient {
    pub fn new(base_url: &str, model: &str, api_key: &str) -> Result<Self> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .redirect(reqwest::redirect::Policy::none())
            .user_agent("JobDex/relationship-agent")
            .build()?;
        Ok(Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            model: model.to_string(),
            api_key: api_key.to_string(),
            http,
        })
    }

    /// Sends one structured-response request. One attempt; no retries.
    pub async fn complete_json<T: for<'de> Deserialize<'de>>(
        &self,
        system: &str,
        user: &str,
        max_tokens: u32,
    ) -> Result<T> {
        let body = ChatRequest {
            model: &self.model,
            messages: vec![
                ChatMessage {
                    role: "system",
                    content: system,
                },
                ChatMessage {
                    role: "user",
                    content: user,
                },
            ],
            temperature: 0.2,
            max_tokens: max_tokens.min(MAX_OUTPUT_TOKENS),
            response_format: ResponseFormat {
                r#type: "json_object",
            },
        };

        let response = self
            .http
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    failure("MODEL_TIMEOUT", "The model request timed out")
                } else {
                    failure("MODEL_UNREACHABLE", format!("Could not reach the model: {}", e))
                }
            })?;

        let status = response.status();
        if status.is_redirection() {
            return Err(failure(
                "MODEL_REDIRECTED",
                "The model endpoint redirected the request, which is not allowed",
            ));
        }
        if !status.is_success() {
            let (code, message) = match status.as_u16() {
                401 | 403 => ("MODEL_AUTH", "The provider rejected the API key"),
                429 => ("MODEL_RATE_LIMITED", "The provider rate-limited this request"),
                400..=499 => ("MODEL_HTTP_ERROR", "The provider rejected the request"),
                _ => ("MODEL_SERVER_ERROR", "The provider returned a server error"),
            };
            return Err(failure(code, format!("{} ({})", message, status)));
        }

        let parsed: ChatResponse = response
            .json()
            .await
            .map_err(|_| failure("MODEL_INVALID_JSON", "The provider response was not valid JSON"))?;

        let choice = parsed
            .choices
            .into_iter()
            .next()
            .ok_or_else(|| failure("MODEL_EMPTY_RESPONSE", "The provider returned no choices"))?;

        if choice
            .finish_reason
            .as_deref()
            .map(|r| r == "content_filter")
            .unwrap_or(false)
        {
            return Err(failure("MODEL_REFUSED", "The provider refused this request"));
        }
        if choice
            .message
            .refusal
            .as_deref()
            .map(|r| !r.trim().is_empty())
            .unwrap_or(false)
        {
            return Err(failure("MODEL_REFUSED", "The provider refused this request"));
        }

        let content = choice
            .message
            .content
            .ok_or_else(|| failure("MODEL_EMPTY_RESPONSE", "The provider returned no content"))?;
        let cleaned = strip_code_fence(&content);

        serde_json::from_str::<T>(&cleaned).map_err(|e| {
            failure(
                "MODEL_INVALID_SCHEMA",
                format!("The provider response did not match the expected structure: {}", e),
            )
        })
    }
}

fn strip_code_fence(content: &str) -> String {
    let trimmed = content.trim();
    let without_open = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .unwrap_or(trimmed);
    without_open
        .strip_suffix("```")
        .unwrap_or(without_open)
        .trim()
        .to_string()
}

/// Truncates on a UTF-8 boundary and reports whether content was lost.
pub fn truncate_utf8(value: &str, max_bytes: usize) -> (String, bool) {
    if value.len() <= max_bytes {
        return (value.to_string(), false);
    }
    let mut end = max_bytes;
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    (value[..end].to_string(), true)
}

#[derive(Deserialize)]
struct ProbeResponse {
    ok: bool,
}

/// Validates that the configured endpoint really answers a structured request.
/// A successful call is what marks the configuration verified.
pub async fn test_connection(pool: &SqlitePool) -> Result<ModelStatus> {
    let _authority = AUTHORITY.lock().await;
    let settings = load(pool).await?;
    if settings.model.trim().is_empty() {
        return Err(failure("MODEL_NOT_CONFIGURED", "No model identifier is configured"));
    }
    let api_key = load_key().await?;

    // Connection tests count against the budget: they are billable requests.
    reserve_request(pool).await?;

    let client = ModelClient::new(&settings.base_url, &settings.model, &api_key)?;
    let result: Result<ProbeResponse> = client
        .complete_json(
            "You validate API connectivity. Reply with compact JSON only.",
            "Return exactly this JSON object and nothing else: {\"ok\": true}",
            64,
        )
        .await;

    match result {
        Ok(probe) if probe.ok => {
            let hash = config_hash(&settings.base_url, &settings.model);
            write(pool, K_VERIFIED, &hash).await?;
            clear_error(pool).await;
            status(pool).await
        }
        Ok(_) => {
            let err = failure(
                "MODEL_UNSUPPORTED",
                "The endpoint answered, but not with the expected structured response",
            );
            record_error(pool, &err.to_string()).await;
            Err(err)
        }
        Err(e) => {
            record_error(pool, &e.to_string()).await;
            Err(e)
        }
    }
}

/// Returns a client only when the full gate is satisfied: consent-verified config,
/// key present, not paused. Callers must additionally check per-contact consent.
pub async fn client_for_use(pool: &SqlitePool) -> Result<Option<ModelClient>> {
    let _authority = AUTHORITY.lock().await;
    let settings = load(pool).await?;
    if !model_ready(&settings) {
        return Ok(None);
    }
    let api_key = match load_key().await {
        Ok(k) => k,
        Err(_) => return Ok(None),
    };
    Ok(Some(ModelClient::new(
        &settings.base_url,
        &settings.model,
        &api_key,
    )?))
}

#[cfg(test)]
mod tests {
    use super::*;

    std::thread_local! {
        pub(super) static KEY_LOOKUPS: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
    }

    #[tokio::test]
    async fn unconfigured_status_does_not_request_keychain_access() {
        let env = crate::relationship_agent::tests::TestEnv::new().await;
        let before = KEY_LOOKUPS.with(|reads| reads.get());
        // Dashboard and onboarding may request status independently.
        for _ in 0..2 {
            assert!(!status(&env.pool).await.unwrap().configured);
        }
        assert_eq!(KEY_LOOKUPS.with(|reads| reads.get()), before);

        write(&env.pool, K_MODEL, "configured-model").await.unwrap();
        status(&env.pool).await.unwrap();
        assert_eq!(KEY_LOOKUPS.with(|reads| reads.get()), before + 1);
    }

    #[test]
    fn base_url_must_be_https_without_extras() {
        assert!(validate_base_url("http://api.example.com/v1").is_err());
        assert!(validate_base_url("https://user:pw@api.example.com/v1").is_err());
        assert!(validate_base_url("https://api.example.com/v1?x=1").is_err());
        assert!(validate_base_url("https://api.example.com/v1#frag").is_err());
        assert_eq!(
            validate_base_url("https://api.example.com/v1/").unwrap(),
            "https://api.example.com/v1"
        );
    }

    #[test]
    fn truncation_respects_char_boundaries() {
        let (out, truncated) = truncate_utf8("héllo wörld", 4);
        assert!(truncated);
        assert!(out.len() <= 4);
        assert!(out.is_char_boundary(out.len()));
    }

    #[test]
    fn code_fences_are_stripped() {
        assert_eq!(strip_code_fence("```json\n{\"a\":1}\n```"), "{\"a\":1}");
        assert_eq!(strip_code_fence("{\"a\":1}"), "{\"a\":1}");
    }
}
