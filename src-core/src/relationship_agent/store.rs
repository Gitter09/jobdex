//! Persistence helpers for the relationship agent.
//!
//! Every function takes the single production pool (or an open transaction). No
//! second connection is ever created here.

use super::models::*;
use anyhow::Result;
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool};

pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

/// Canonical-JSON fingerprint. Key order is fixed by the caller's struct order,
/// so identical inputs always hash identically.
pub fn fingerprint<T: Serialize>(value: &T) -> Result<String> {
    Ok(sha256_hex(&serde_json::to_string(value)?))
}

// ===== Contacts =====

pub async fn contact_exists(pool: &SqlitePool, contact_id: &str) -> Result<bool> {
    let found: Option<String> = sqlx::query_scalar("SELECT id FROM contacts WHERE id = ?")
        .bind(contact_id)
        .fetch_optional(pool)
        .await?;
    Ok(found.is_some())
}

pub async fn contact_email(pool: &SqlitePool, contact_id: &str) -> Result<Option<String>> {
    let email: Option<Option<String>> = sqlx::query_scalar("SELECT email FROM contacts WHERE id = ?")
        .bind(contact_id)
        .fetch_optional(pool)
        .await?;
    Ok(email.flatten().filter(|e| !e.trim().is_empty()))
}

pub async fn validated_contact_ids(
    pool: &SqlitePool,
    contact_ids: &[String],
) -> Result<Vec<String>> {
    let mut out = Vec::with_capacity(contact_ids.len());
    for id in contact_ids {
        if !contact_exists(pool, id).await? {
            anyhow::bail!("Unknown contact: {}", id);
        }
        out.push(id.clone());
    }
    Ok(out)
}

// ===== External API scope =====

const K_API_ACCESS: &str = "api.relationship_access";
const K_API_CONTACTS: &str = "api.allowed_contact_ids";
const K_API_CREATE: &str = "api.allow_contact_creation";

/// What an external bearer key is allowed to see and do. Kept strictly separate
/// from model-disclosure consent.
#[derive(Debug, Clone)]
pub struct ApiScopeSettings {
    pub access: AccessMode,
    pub allowed_contact_ids: Vec<String>,
    pub allow_contact_creation: bool,
}

pub async fn load_api_scope(pool: &SqlitePool) -> Result<ApiScopeSettings> {
    let access = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(K_API_ACCESS)
        .fetch_optional(pool)
        .await?
        .and_then(|v| AccessMode::parse(&v).ok())
        .unwrap_or(AccessMode::Read);

    let allowed_contact_ids = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(K_API_CONTACTS)
        .fetch_optional(pool)
        .await?
        .and_then(|v| serde_json::from_str::<Vec<String>>(&v).ok())
        .unwrap_or_default();

    let allow_contact_creation =
        sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
            .bind(K_API_CREATE)
            .fetch_optional(pool)
            .await?
            .map(|v| v == "true")
            .unwrap_or(false);

    Ok(ApiScopeSettings {
        access,
        allowed_contact_ids,
        allow_contact_creation,
    })
}

/// Validated write. Every listed contact must actually exist.
pub async fn save_api_scope(
    pool: &SqlitePool,
    access: AccessMode,
    contact_ids: &[String],
    allow_contact_creation: bool,
) -> Result<ApiScopeSettings> {
    let mut normalized = Vec::new();
    for id in contact_ids {
        let id = validate_id(id, "allowedContactIds")?;
        if !contact_exists(pool, &id).await? {
            return Err(anyhow::anyhow!("Unknown contact: {}", id));
        }
        if !normalized.contains(&id) {
            normalized.push(id);
        }
    }

    for (key, value) in [
        (K_API_ACCESS, access.as_str().to_string()),
        (K_API_CONTACTS, serde_json::to_string(&normalized)?),
        (K_API_CREATE, if allow_contact_creation { "true" } else { "false" }.to_string()),
    ] {
        sqlx::query(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .bind(key)
        .bind(value)
        .execute(pool)
        .await?;
    }

    load_api_scope(pool).await
}

/// Adds one contact to the external scope without touching model consent.
pub async fn add_to_api_scope(pool: &SqlitePool, contact_id: &str) -> Result<()> {
    let current = load_api_scope(pool).await?;
    if current.allowed_contact_ids.iter().any(|id| id == contact_id) {
        return Ok(());
    }
    let mut ids = current.allowed_contact_ids;
    ids.push(contact_id.to_string());
    save_api_scope(pool, current.access, &ids, current.allow_contact_creation).await?;
    Ok(())
}

// ===== Activity =====

const ACTIVITY_SELECT: &str = "SELECT id, action_id, workflow_id, contact_id, event_type, detail_json, created_at FROM relationship_activity";

pub async fn log_activity(
    pool: &SqlitePool,
    action_id: Option<&str>,
    workflow_id: Option<&str>,
    contact_id: &str,
    event_type: &str,
    detail: serde_json::Value,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO relationship_activity (id, action_id, workflow_id, contact_id, event_type, detail_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(action_id)
    .bind(workflow_id)
    .bind(contact_id)
    .bind(event_type)
    .bind(serde_json::to_string(&detail)?)
    .bind(now_iso())
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn list_activity(
    pool: &SqlitePool,
    contact_id: Option<&str>,
) -> Result<Vec<RelationshipActivity>> {
    let rows = match contact_id {
        Some(id) => {
            let sql = format!(
                "{} WHERE contact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
                ACTIVITY_SELECT
            );
            sqlx::query(&sql)
                .bind(id)
                .bind(MAX_ACTIVITY_ROWS)
                .fetch_all(pool)
                .await?
        }
        None => {
            let sql = format!(
                "{} ORDER BY created_at DESC, id DESC LIMIT ?",
                ACTIVITY_SELECT
            );
            sqlx::query(&sql)
                .bind(MAX_ACTIVITY_ROWS)
                .fetch_all(pool)
                .await?
        }
    };

    rows.into_iter()
        .map(|row| {
            let detail_json: String = row.get("detail_json");
            Ok(RelationshipActivity {
                id: row.get("id"),
                action_id: row.get("action_id"),
                workflow_id: row.get("workflow_id"),
                contact_id: row.get("contact_id"),
                event_type: row.get("event_type"),
                detail: serde_json::from_str(&detail_json).unwrap_or(serde_json::Value::Null),
                created_at: row.get("created_at"),
            })
        })
        .collect()
}

// ===== Goals =====

pub async fn list_goals(pool: &SqlitePool) -> Result<Vec<RelationshipGoal>> {
    let goals = sqlx::query_as::<_, RelationshipGoal>(
        "SELECT id, title, intent, status, created_at, updated_at FROM relationship_goals ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await?;
    Ok(goals)
}

pub async fn get_goal(pool: &SqlitePool, id: &str) -> Result<Option<RelationshipGoal>> {
    let goal = sqlx::query_as::<_, RelationshipGoal>(
        "SELECT id, title, intent, status, created_at, updated_at FROM relationship_goals WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(goal)
}

// ===== Workflows =====

const WORKFLOW_SELECT: &str = "SELECT id, goal_id, title, intent, spec_json, revision, status, activated_at, created_at, updated_at FROM relationship_workflows";

fn workflow_from_row(row: sqlx::sqlite::SqliteRow) -> Result<RelationshipWorkflow> {
    let spec_json: String = row.get("spec_json");
    let spec: WorkflowSpec = serde_json::from_str(&spec_json)
        .map_err(|e| anyhow::anyhow!("Stored workflow spec is invalid: {}", e))?;
    Ok(RelationshipWorkflow {
        id: row.get("id"),
        goal_id: row.get("goal_id"),
        title: row.get("title"),
        intent: row.get("intent"),
        spec,
        revision: row.get("revision"),
        status: row.get("status"),
        activated_at: row.get("activated_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub async fn list_workflows(pool: &SqlitePool) -> Result<Vec<RelationshipWorkflow>> {
    let sql = format!("{} ORDER BY created_at ASC", WORKFLOW_SELECT);
    let rows = sqlx::query(&sql).fetch_all(pool).await?;
    rows.into_iter().map(workflow_from_row).collect()
}

pub async fn get_workflow(pool: &SqlitePool, id: &str) -> Result<Option<RelationshipWorkflow>> {
    let sql = format!("{} WHERE id = ?", WORKFLOW_SELECT);
    let row = sqlx::query(&sql).bind(id).fetch_optional(pool).await?;
    match row {
        Some(row) => Ok(Some(workflow_from_row(row)?)),
        None => Ok(None),
    }
}

/// Active, unpaused workflows. This is the only set the runner evaluates.
pub async fn runnable_workflows(pool: &SqlitePool) -> Result<Vec<RelationshipWorkflow>> {
    let sql = format!(
        "{} WHERE status = 'active' ORDER BY created_at ASC",
        WORKFLOW_SELECT
    );
    let rows = sqlx::query(&sql).fetch_all(pool).await?;
    rows.into_iter().map(workflow_from_row).collect()
}

// ===== Memory =====

const MEMORY_SELECT: &str = "SELECT id, contact_id, kind, text, origin, source_message_id, source_quote, due_at, status, created_at, updated_at FROM relationship_memory";

pub async fn list_memory(pool: &SqlitePool, contact_id: &str) -> Result<Vec<RelationshipMemory>> {
    let sql = format!(
        "{} WHERE contact_id = ? AND status != 'superseded' ORDER BY created_at ASC",
        MEMORY_SELECT
    );
    let memory = sqlx::query_as::<_, RelationshipMemory>(&sql)
        .bind(contact_id)
        .fetch_all(pool)
        .await?;
    Ok(memory)
}

pub async fn confirmed_memory(
    pool: &SqlitePool,
    contact_id: &str,
) -> Result<Vec<RelationshipMemory>> {
    let sql = format!(
        "{} WHERE contact_id = ? AND status = 'confirmed' ORDER BY created_at ASC",
        MEMORY_SELECT
    );
    let memory = sqlx::query_as::<_, RelationshipMemory>(&sql)
        .bind(contact_id)
        .fetch_all(pool)
        .await?;
    Ok(memory)
}

pub async fn get_memory(pool: &SqlitePool, id: &str) -> Result<Option<RelationshipMemory>> {
    let sql = format!("{} WHERE id = ?", MEMORY_SELECT);
    let memory = sqlx::query_as::<_, RelationshipMemory>(&sql)
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(memory)
}

pub async fn has_boundary(pool: &SqlitePool, contact_id: &str) -> Result<bool> {
    let found: Option<String> = sqlx::query_scalar(
        "SELECT id FROM relationship_memory WHERE contact_id = ? AND kind = 'boundary' AND status = 'confirmed' LIMIT 1",
    )
    .bind(contact_id)
    .fetch_optional(pool)
    .await?;
    Ok(found.is_some())
}

// ===== Actions =====

pub(crate) const ACTION_SELECT: &str = "SELECT id, workflow_id, contact_id, kind, status, payload_json, evidence_json, context_hash, revision, due_at, snoozed_until, approved_at, approved_revision, send_started_at, provider_receipt, error_code, created_at, updated_at FROM relationship_actions";

pub(crate) fn action_from_row(row: sqlx::sqlite::SqliteRow) -> Result<RelationshipAction> {
    let payload_json: Option<String> = row.get("payload_json");
    let evidence_json: String = row.get("evidence_json");
    Ok(RelationshipAction {
        id: row.get("id"),
        workflow_id: row.get("workflow_id"),
        contact_id: row.get("contact_id"),
        kind: row.get("kind"),
        status: row.get("status"),
        payload: payload_json
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok()),
        evidence: serde_json::from_str(&evidence_json).unwrap_or_default(),
        context_hash: row.get("context_hash"),
        revision: row.get("revision"),
        due_at: row.get("due_at"),
        snoozed_until: row.get("snoozed_until"),
        approved_at: row.get("approved_at"),
        approved_revision: row.get("approved_revision"),
        send_started_at: row.get("send_started_at"),
        provider_receipt: row.get("provider_receipt"),
        error_code: row.get("error_code"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub async fn list_actions(pool: &SqlitePool) -> Result<Vec<RelationshipAction>> {
    let sql = format!(
        "{} WHERE status NOT IN ('dismissed') ORDER BY created_at DESC, id DESC",
        ACTION_SELECT
    );
    let rows = sqlx::query(&sql).fetch_all(pool).await?;
    rows.into_iter().map(action_from_row).collect()
}

pub async fn get_action(pool: &SqlitePool, id: &str) -> Result<Option<RelationshipAction>> {
    let sql = format!("{} WHERE id = ?", ACTION_SELECT);
    let row = sqlx::query(&sql).bind(id).fetch_optional(pool).await?;
    match row {
        Some(row) => Ok(Some(action_from_row(row)?)),
        None => Ok(None),
    }
}

pub async fn action_exists_by_dedupe(pool: &SqlitePool, dedupe_key: &str) -> Result<bool> {
    let found: Option<String> =
        sqlx::query_scalar("SELECT id FROM relationship_actions WHERE dedupe_key = ?")
            .bind(dedupe_key)
            .fetch_optional(pool)
            .await?;
    Ok(found.is_some())
}

// ===== Processing =====

pub async fn processing_status(
    pool: &SqlitePool,
    contact_id: &str,
    input_hash: &str,
) -> Result<Option<String>> {
    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT status, contact_id FROM relationship_processing WHERE input_hash = ?",
    )
    .bind(input_hash)
    .fetch_optional(pool)
    .await?;
    Ok(row
        .filter(|(_, stored_contact)| stored_contact == contact_id)
        .map(|(status, _)| status))
}

pub async fn upsert_processing(
    pool: &SqlitePool,
    contact_id: &str,
    input_hash: &str,
    status: ProcessingStatus,
    error_code: Option<&str>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO relationship_processing (id, contact_id, input_hash, status, error_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(input_hash) DO UPDATE SET status = excluded.status, error_code = excluded.error_code, updated_at = excluded.updated_at",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(contact_id)
    .bind(input_hash)
    .bind(status.as_str())
    .bind(error_code)
    .bind(now_iso())
    .bind(now_iso())
    .execute(pool)
    .await?;
    Ok(())
}

// ===== Contact deletion / consent revocation =====

/// Removes every relationship-agent record belonging to the given contacts and
/// rewrites workflow scopes so deleted people cannot be reached again.
///
/// Existing deletion paths use manual cleanup rather than foreign-key cascades,
/// so this must be called from all of them.
pub async fn purge_contacts(pool: &SqlitePool, contact_ids: &[String]) -> Result<()> {
    if contact_ids.is_empty() {
        return Ok(());
    }
    let mut tx = pool.begin().await?;
    purge_contacts_tx(&mut tx, contact_ids).await?;
    tx.commit().await?;
    Ok(())
}

/// Transaction-scoped sibling of [`purge_contacts`], for callers that already own
/// the delete transaction.
pub async fn purge_contacts_tx(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    contact_ids: &[String],
) -> Result<()> {
    if contact_ids.is_empty() {
        return Ok(());
    }
    for id in contact_ids {
        sqlx::query("DELETE FROM relationship_actions WHERE contact_id = ?")
            .bind(id)
            .execute(&mut **tx)
            .await?;
        sqlx::query("DELETE FROM relationship_memory WHERE contact_id = ?")
            .bind(id)
            .execute(&mut **tx)
            .await?;
        sqlx::query("DELETE FROM relationship_processing WHERE contact_id = ?")
            .bind(id)
            .execute(&mut **tx)
            .await?;
        sqlx::query("DELETE FROM relationship_activity WHERE contact_id = ?")
            .bind(id)
            .execute(&mut **tx)
            .await?;
    }

    scrub_workflow_scopes(tx, contact_ids).await?;
    Ok(())
}

/// Wipes the whole relationship-agent domain. Used by "clear all data".
pub async fn purge_all_tx(tx: &mut sqlx::Transaction<'_, Sqlite>) -> Result<()> {
    for table in [
        "relationship_actions",
        "relationship_memory",
        "relationship_activity",
        "relationship_processing",
        "relationship_workflows",
        "relationship_goals",
    ] {
        sqlx::query(&format!("DELETE FROM {}", table))
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

/// Consent revocation: drop model-derived memory, drop queued processing, take
/// the contact out of every workflow scope and invalidate drafts derived from it.
/// User-authored memory survives because the user wrote it, not the model.
pub async fn revoke_contact_consent(pool: &SqlitePool, contact_id: &str) -> Result<()> {
    let mut tx = pool.begin().await?;

    // Source-derived and inferred memory goes; user-authored memory stays, because
    // the user is the author of that text, not the model.
    sqlx::query("DELETE FROM relationship_memory WHERE contact_id = ? AND origin != 'user'")
        .bind(contact_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM relationship_processing WHERE contact_id = ?")
        .bind(contact_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "UPDATE relationship_actions
         SET status = 'blocked', error_code = 'CONSENT_REVOKED', approved_at = NULL, approved_revision = NULL, updated_at = ?
         WHERE contact_id = ?
           AND status IN ('preparing', 'needs_review', 'approved', 'snoozed')",
    )
    .bind(now_iso())
    .bind(contact_id)
    .execute(&mut *tx)
    .await?;

    scrub_workflow_scopes(&mut tx, &[contact_id.to_string()]).await?;
    tx.commit().await?;
    Ok(())
}

/// Removes contact IDs from every workflow spec, bumps the revision, and either
/// pauses the workflow (empty scope) or invalidates its outstanding approvals.
pub async fn scrub_workflow_scopes(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    contact_ids: &[String],
) -> Result<()> {
    let rows = sqlx::query("SELECT id, spec_json, status FROM relationship_workflows")
        .fetch_all(&mut **tx)
        .await?;

    for row in rows {
        let workflow_id: String = row.get("id");
        let spec_json: String = row.get("spec_json");
        let status: String = row.get("status");
        let mut spec: WorkflowSpec = match serde_json::from_str(&spec_json) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let before = spec.contact_ids.len();
        spec.contact_ids.retain(|id| !contact_ids.contains(id));
        if spec.contact_ids.len() == before {
            continue;
        }

        let now = now_iso();
        let scope_empty = spec.contact_ids.is_empty();
        if scope_empty && status == WorkflowStatus::Active.as_str() {
            sqlx::query(
                "UPDATE relationship_workflows SET spec_json = ?, revision = revision + 1, status = 'paused', updated_at = ? WHERE id = ?",
            )
            .bind(serde_json::to_string(&spec)?)
            .bind(&now)
            .bind(&workflow_id)
            .execute(&mut **tx)
            .await?;
        } else {
            sqlx::query(
                "UPDATE relationship_workflows SET spec_json = ?, revision = revision + 1, updated_at = ? WHERE id = ?",
            )
            .bind(serde_json::to_string(&spec)?)
            .bind(&now)
            .bind(&workflow_id)
            .execute(&mut **tx)
            .await?;
        }

        // Approvals are bound to the scope they were granted under.
        sqlx::query(
            "UPDATE relationship_actions
             SET status = 'needs_review', approved_at = NULL, approved_revision = NULL, updated_at = ?
             WHERE workflow_id = ? AND status IN ('approved', 'preparing')",
        )
        .bind(&now)
        .bind(&workflow_id)
        .execute(&mut **tx)
        .await?;

        // The people removed from scope can no longer be reached by this workflow.
        for removed in contact_ids {
            sqlx::query(
                "UPDATE relationship_actions SET status = 'dismissed', updated_at = ?
                 WHERE workflow_id = ? AND status = 'needs_review' AND contact_id = ?",
            )
            .bind(&now)
            .bind(&workflow_id)
            .bind(removed)
            .execute(&mut **tx)
            .await?;
        }
    }
    Ok(())
}
