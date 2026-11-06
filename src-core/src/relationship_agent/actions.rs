//! Action lifecycle: review, exact approval and non-duplicating delivery.
//!
//! Exactly-once network delivery is impossible, so this module deliberately prefers
//! a visible `delivery_unknown` state over ever sending the same message twice.

use super::models::*;
use super::model;
use super::store;
use anyhow::{anyhow, Result};
use serde::Serialize;
use sqlx::SqlitePool;

pub const APPROVAL_TTL_SECONDS: i64 = 24 * 60 * 60;
/// A `preparing` action older than this was interrupted by a crash.
pub const PREPARING_STALE_SECONDS: i64 = 120;
/// Grace period before a claimed send is treated as ambiguous.
pub const SENDING_STALE_SECONDS: i64 = 120;

// ===== Listing =====

pub async fn list(pool: &SqlitePool) -> Result<Vec<RelationshipAction>> {
    store::list_actions(pool).await
}

pub async fn get(pool: &SqlitePool, id: &str) -> Result<RelationshipAction> {
    store::get_action(pool, id)
        .await?
        .ok_or_else(|| anyhow!("Unknown action"))
}

// ===== Context fingerprint =====

#[derive(Serialize)]
struct ActionFingerprint {
    contact_id: String,
    contact_email: Option<String>,
    account_id: Option<String>,
    workflow_revision: Option<i64>,
    sources: Vec<(String, String, Option<String>)>,
    memory: Vec<(String, String)>,
    permission_revision: i64,
}

/// Fingerprint of everything an approval depends on. Recomputed before approval and
/// again before the provider call; any drift invalidates the approval.
pub async fn context_hash(
    pool: &SqlitePool,
    contact_id: &str,
    workflow_id: Option<&str>,
    account_id: Option<&str>,
) -> Result<String> {
    let contact_email = store::contact_email(pool, contact_id).await?;

    let workflow_revision = match workflow_id {
        Some(id) => store::get_workflow(pool, id).await?.map(|w| w.revision),
        None => None,
    };

    let message_rows = sqlx::query_as::<_, (String, Option<String>, Option<String>)>(
        "SELECT m.id, m.body, CAST(m.sent_at AS TEXT)
         FROM email_messages m
         WHERE m.thread_id IN (SELECT id FROM email_threads WHERE contact_id = ?)
         ORDER BY m.sent_at DESC, m.created_at DESC
         LIMIT 20",
    )
    .bind(contact_id)
    .fetch_all(pool)
    .await?;

    let mut sources: Vec<(String, String, Option<String>)> = message_rows
        .into_iter()
        .map(|(id, body, sent_at)| {
            (
                id,
                store::sha256_hex(&super::memory::normalize_text(&body.unwrap_or_default())),
                sent_at,
            )
        })
        .collect();
    sources.sort();

    let mut memory: Vec<(String, String)> = store::confirmed_memory(pool, contact_id)
        .await?
        .into_iter()
        .map(|m| (m.id, m.updated_at))
        .collect();
    memory.sort();

    let permission_revision = model::permission_revision(pool).await?;

    store::fingerprint(&ActionFingerprint {
        contact_id: contact_id.to_string(),
        contact_email,
        account_id: account_id.map(|s| s.to_string()),
        workflow_revision,
        sources,
        memory,
        permission_revision,
    })
}

fn account_of(action: &RelationshipAction) -> Option<String> {
    action
        .payload
        .as_ref()
        .and_then(|p| serde_json::from_value::<EmailDraftPayload>(p.clone()).ok())
        .map(|p| p.account_id)
}

async fn action_account_id(pool: &SqlitePool, action: &RelationshipAction) -> Result<Option<String>> {
    if let Some(account) = account_of(action) {
        return Ok(Some(account));
    }
    if let Some(workflow_id) = action.workflow_id.as_deref() {
        if let Some(workflow) = store::get_workflow(pool, workflow_id).await? {
            return Ok(workflow.spec.account_id);
        }
    }
    Ok(None)
}

pub async fn recompute_hash(pool: &SqlitePool, action: &RelationshipAction) -> Result<String> {
    let account = action_account_id(pool, action).await?;
    context_hash(
        pool,
        &action.contact_id,
        action.workflow_id.as_deref(),
        account.as_deref(),
    )
    .await
}

// ===== Creation =====

/// Local manual reminder. No model, no email account, no workflow required.
pub async fn create_reminder(
    pool: &SqlitePool,
    contact_id: &str,
    title: String,
    description: String,
    due_at: String,
) -> Result<RelationshipAction> {
    if !store::contact_exists(pool, contact_id).await? {
        return Err(anyhow!("Unknown contact"));
    }
    let payload = ReminderPayload {
        title: validate_title(&title)?,
        description: validate_long_text(&description, "description")?,
    };
    payload.validate()?;
    let due_at = normalize_timestamp(&due_at, "dueAt")?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    sqlx::query(
        "INSERT INTO relationship_actions
            (id, workflow_id, contact_id, kind, status, payload_json, evidence_json, context_hash, revision, dedupe_key, due_at, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, '{}', '', 1, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(contact_id)
    .bind(ActionKind::Reminder.as_str())
    .bind(ActionStatus::NeedsReview.as_str())
    .bind(serde_json::to_string(&payload)?)
    .bind(format!("rem:{}", id))
    .bind(&due_at)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    store::log_activity(
        pool,
        Some(&id),
        None,
        contact_id,
        "reminder_created",
        serde_json::json!({ "title": payload.title }),
    )
    .await?;

    get(pool, &id).await
}

// ===== Editing =====

pub async fn edit_draft(
    pool: &SqlitePool,
    id: &str,
    expected_revision: i64,
    payload: EmailDraftPayload,
) -> Result<RelationshipAction> {
    let action = get(pool, id).await?;
    if action.kind != ActionKind::EmailDraft.as_str() {
        return Err(anyhow!("Only email drafts can be edited"));
    }
    if action.revision != expected_revision {
        return Err(anyhow!(super::workflows::REVISION_CONFLICT));
    }
    match action.status.as_str() {
        s if s == ActionStatus::NeedsReview.as_str()
            || s == ActionStatus::Approved.as_str()
            || s == ActionStatus::Snoozed.as_str()
            || s == ActionStatus::Blocked.as_str() => {}
        _ => return Err(anyhow!("This draft can no longer be edited")),
    }

    payload.validate()?;

    // The recipient must remain the contact's current address.
    let current = store::contact_email(pool, &action.contact_id).await?;
    if current.as_deref().map(|e| e.to_lowercase()) != Some(payload.to.clone()) {
        return Err(anyhow!(
            "The recipient is not this contact's current email address"
        ));
    }
    if store::has_boundary(pool, &action.contact_id).await? {
        return Err(anyhow!(
            "This person has a do-not-contact boundary; drafts are blocked"
        ));
    }
    let account_exists: Option<String> = sqlx::query_scalar("SELECT id FROM email_accounts WHERE id = ?")
        .bind(&payload.account_id)
        .fetch_optional(pool)
        .await?;
    if account_exists.is_none() {
        return Err(anyhow!("Unknown sending account"));
    }

    let now = now_iso();
    let updated = sqlx::query(
        "UPDATE relationship_actions
         SET payload_json = ?, status = 'needs_review', revision = revision + 1,
             approved_at = NULL, approved_revision = NULL, error_code = NULL, updated_at = ?
         WHERE id = ? AND revision = ? AND status IN ('needs_review','approved','snoozed','blocked') AND send_started_at IS NULL",
    )
    .bind(serde_json::to_string(&payload)?)
    .bind(&now)
    .bind(&action.id)
    .bind(expected_revision)
    .execute(pool)
    .await?;

    if updated.rows_affected() != 1 {
        return Err(anyhow!(super::workflows::REVISION_CONFLICT));
    }

    store::log_activity(
        pool,
        Some(&action.id),
        action.workflow_id.as_deref(),
        &action.contact_id,
        "draft_edited",
        serde_json::json!({ "revision": expected_revision + 1 }),
    )
    .await?;

    get(pool, id).await
}

// ===== Review =====

pub async fn review(
    pool: &SqlitePool,
    id: &str,
    expected_revision: i64,
    decision: ReviewDecision,
    snoozed_until: Option<String>,
) -> Result<RelationshipAction> {
    let action = get(pool, id).await?;
    if action.revision != expected_revision {
        return Err(anyhow!(super::workflows::REVISION_CONFLICT));
    }
    if !matches!(action.status.as_str(), "needs_review" | "approved" | "snoozed" | "blocked") {
        return Err(anyhow!("This action is no longer reviewable"));
    }
    if action.kind == "email_draft" && action.send_started_at.is_some() {
        return Err(anyhow!("Check Sent mail; this email has already entered delivery"));
    }
    if decision == ReviewDecision::Approve {
        validate_workflow_authority(pool, &action).await?;
    }

    let now = now_iso();

    match decision {
        ReviewDecision::Approve => {
            if action.kind != ActionKind::EmailDraft.as_str() {
                return Err(anyhow!("A reminder cannot be approved as an email"));
            }
            if action.status != ActionStatus::NeedsReview.as_str() {
                return Err(anyhow!("This action is not awaiting review"));
            }
            let payload = action.email_payload()?;
            payload.validate()?;

            let settings = model::load(pool).await?;
            if settings.paused {
                return Err(anyhow!("The relationship agent is paused"));
            }

            let current_recipient = store::contact_email(pool, &action.contact_id).await?;
            if current_recipient.as_deref().map(|e| e.to_lowercase()) != Some(payload.to.clone()) {
                return Err(anyhow!(
                    "The contact's email changed after this draft was prepared"
                ));
            }
            if store::has_boundary(pool, &action.contact_id).await? {
                return Err(anyhow!(
                    "This person has a do-not-contact boundary; sending is blocked"
                ));
            }

            let fresh_hash = recompute_hash(pool, &action).await?;
            if !action.context_hash.is_empty() && fresh_hash != action.context_hash {
                sqlx::query(
                    "UPDATE relationship_actions SET status = 'needs_review', context_hash = ?, updated_at = ? WHERE id = ?",
                )
                .bind(&fresh_hash)
                .bind(&now)
                .bind(&action.id)
                .execute(pool)
                .await?;
                return Err(anyhow!(
                    "The conversation changed since this draft was prepared. Review it again."
                ));
            }

            sqlx::query(
                "UPDATE relationship_actions
                 SET status = 'approved', approved_at = ?, approved_revision = revision, error_code = NULL, updated_at = ?
                 WHERE id = ? AND revision = ? AND status = 'needs_review' AND send_started_at IS NULL",
            )
            .bind(&now)
            .bind(&now)
            .bind(&action.id)
            .bind(expected_revision)
            .execute(pool)
            .await?;

            store::log_activity(
                pool,
                Some(&action.id),
                action.workflow_id.as_deref(),
                &action.contact_id,
                "action_approved",
                serde_json::json!({ "revision": expected_revision }),
            )
            .await?;
        }
        ReviewDecision::Dismiss => {
            sqlx::query(
                "UPDATE relationship_actions SET status = 'dismissed', approved_at = NULL, approved_revision = NULL, updated_at = ?
                 WHERE id = ? AND revision = ? AND status IN ('needs_review','approved','snoozed','blocked') AND send_started_at IS NULL",
            )
            .bind(&now)
            .bind(&action.id)
            .bind(expected_revision)
            .execute(pool)
            .await?;
            store::log_activity(
                pool,
                Some(&action.id),
                action.workflow_id.as_deref(),
                &action.contact_id,
                "action_dismissed",
                serde_json::json!({}),
            )
            .await?;
        }
        ReviewDecision::Done => {
            if action.kind != ActionKind::Reminder.as_str() {
                return Err(anyhow!("Only reminders can be marked done"));
            }
            sqlx::query(
                "UPDATE relationship_actions SET status = 'done', updated_at = ? WHERE id = ? AND revision = ? AND status IN ('needs_review','snoozed','blocked')",
            )
            .bind(&now)
            .bind(&action.id)
            .bind(expected_revision)
            .execute(pool)
            .await?;
            store::log_activity(
                pool,
                Some(&action.id),
                action.workflow_id.as_deref(),
                &action.contact_id,
                "reminder_done",
                serde_json::json!({}),
            )
            .await?;
        }
        ReviewDecision::Snooze => {
            let until = snoozed_until
                .as_deref()
                .ok_or_else(|| anyhow!("A snooze needs a future time"))?;
            let until = normalize_timestamp(until, "snoozedUntil")?;
            let parsed = parse_timestamp(&until, "snoozedUntil")?;
            if parsed <= chrono::Utc::now() {
                return Err(anyhow!("Snooze time must be in the future"));
            }
            sqlx::query(
                "UPDATE relationship_actions
                 SET status = 'snoozed', snoozed_until = ?, approved_at = NULL, approved_revision = NULL, updated_at = ?
                 WHERE id = ? AND revision = ? AND status IN ('needs_review','approved','snoozed','blocked') AND send_started_at IS NULL",
            )
            .bind(&until)
            .bind(&now)
            .bind(&action.id)
            .bind(expected_revision)
            .execute(pool)
            .await?;
            store::log_activity(
                pool,
                Some(&action.id),
                action.workflow_id.as_deref(),
                &action.contact_id,
                "action_snoozed",
                serde_json::json!({ "until": until }),
            )
            .await?;
        }
    }

    get(pool, id).await
}

/// Externally proposed draft. The author is another agent, not the configured
/// model, so it does not need model disclosure consent — only native review.
pub async fn create_external_draft(
    pool: &SqlitePool,
    contact_id: &str,
    payload: EmailDraftPayload,
    origin: &str,
) -> Result<RelationshipAction> {
    if !store::contact_exists(pool, contact_id).await? {
        return Err(anyhow!("Unknown contact"));
    }
    payload.validate()?;

    let current = store::contact_email(pool, contact_id).await?;
    if current.as_deref().map(|e| e.to_lowercase()) != Some(payload.to.clone()) {
        return Err(anyhow!(
            "The recipient is not this contact's current email address"
        ));
    }
    if store::has_boundary(pool, contact_id).await? {
        return Err(anyhow!(
            "This person has a do-not-contact boundary; drafts are blocked"
        ));
    }
    let account: Option<String> = sqlx::query_scalar("SELECT id FROM email_accounts WHERE id = ?")
        .bind(&payload.account_id)
        .fetch_optional(pool)
        .await?;
    if account.is_none() {
        return Err(anyhow!("Unknown sending account"));
    }

    let hash = context_hash(pool, contact_id, None, Some(&payload.account_id)).await?;
    let evidence = ActionEvidence {
        rationale: format!("Draft proposed by {}. You review and send it.", origin),
        ..Default::default()
    };

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    sqlx::query(
        "INSERT INTO relationship_actions
            (id, workflow_id, contact_id, kind, status, payload_json, evidence_json, context_hash, revision, dedupe_key, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
    )
    .bind(&id)
    .bind(contact_id)
    .bind(ActionKind::EmailDraft.as_str())
    .bind(ActionStatus::NeedsReview.as_str())
    .bind(serde_json::to_string(&payload)?)
    .bind(serde_json::to_string(&evidence)?)
    .bind(&hash)
    .bind(format!("ext:{}", id))
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    store::log_activity(
        pool,
        Some(&id),
        None,
        contact_id,
        "external_draft_proposed",
        serde_json::json!({ "origin": origin }),
    )
    .await?;

    get(pool, &id).await
}

/// Explicit retry for a blocked preparation. Never resends an ambiguous delivery.
pub async fn retry(pool: &SqlitePool, id: &str) -> Result<RelationshipAction> {
    let action = get(pool, id).await?;
    // Ambiguity always wins: any record of a provider call means retrying could
    // deliver the same message twice.
    if action.send_started_at.is_some()
        || action.provider_receipt.is_some()
        || action.status == ActionStatus::DeliveryUnknown.as_str()
    {
        return Err(anyhow!(
            "This draft may already have been delivered. Check your Sent mail instead of retrying."
        ));
    }
    if action.status != ActionStatus::Blocked.as_str() {
        return Err(anyhow!("Only blocked actions can be retried"));
    }
    if action.kind != ActionKind::EmailDraft.as_str() {
        return Err(anyhow!("Only email drafts can be retried"));
    }

    sqlx::query(
        "UPDATE relationship_actions SET status = 'preparing', payload_json = NULL, error_code = NULL, updated_at = ? WHERE id = ?",
    )
    .bind(now_iso())
    .bind(&action.id)
    .execute(pool)
    .await?;

    store::log_activity(
        pool,
        Some(&action.id),
        action.workflow_id.as_deref(),
        &action.contact_id,
        "action_retried",
        serde_json::json!({}),
    )
    .await?;

    get(pool, id).await
}

// ===== Delivery =====

#[derive(Debug)]
pub struct DeliveryOutcome {
    pub action: RelationshipAction,
}

async fn validate_workflow_authority(pool: &SqlitePool, action: &RelationshipAction) -> Result<()> {
    if let Some(id) = action.workflow_id.as_deref() {
        let workflow = store::get_workflow(pool, id).await?.ok_or_else(|| anyhow!("Workflow removed"))?;
        if workflow.status != "active" || !workflow.spec.contact_ids.contains(&action.contact_id) {
            return Err(anyhow!("Workflow is inactive or this person is outside its scope"));
        }
        if let Some(goal_id) = workflow.goal_id.as_deref() {
            let goal = store::get_goal(pool, goal_id).await?.ok_or_else(|| anyhow!("Goal removed"))?;
            if goal.status != "active" {
                return Err(anyhow!("The workflow goal is paused or archived"));
            }
        }
    }
    Ok(())
}

#[derive(Clone, Copy)]
pub struct SendGate {
    /// False while the app is locked or the agent is paused.
    pub allowed: bool,
}

/// Preflight, conditional claim, then a single provider call. Errors before the
/// claim are `blocked`; errors after it are `delivery_unknown`.
///
/// `send` is the one outbound side effect: production passes `EmailService`, tests
/// pass a recording fake. There is deliberately no runtime plugin abstraction here.
pub async fn claim_and_send<F, Fut>(
    pool: &SqlitePool,
    id: &str,
    send: F,
    gate: SendGate,
) -> Result<DeliveryOutcome>
where
    F: FnOnce(EmailDraftPayload) -> Fut,
    Fut: std::future::Future<Output = Result<String>>,
{
    let action = get(pool, id).await?;
    if action.status != ActionStatus::Approved.as_str() {
        return Err(anyhow!("This action is not approved for sending"));
    }
    if action.send_started_at.is_some() || action.approved_revision != Some(action.revision) {
        return Err(anyhow!("This exact revision has no unused approval"));
    }
    validate_workflow_authority(pool, &action).await?;

    let payload = action.email_payload()?;
    payload.validate()?;

    let mut blocked: Option<&'static str> = None;

    if !gate.allowed {
        blocked = Some("PAUSED");
    }
    if blocked.is_none() {
        let settings = model::load(pool).await?;
        if settings.paused {
            blocked = Some("PAUSED");
        }
    }
    if blocked.is_none() {
        if let Some(approved_at) = action.approved_at.as_deref() {
            if let Ok(stamp) = parse_timestamp(approved_at, "approvedAt") {
                if (chrono::Utc::now() - stamp).num_seconds() > APPROVAL_TTL_SECONDS {
                    blocked = Some("APPROVAL_EXPIRED");
                }
            }
        } else {
            blocked = Some("APPROVAL_MISSING");
        }
    }
    if blocked.is_none() {
        let current = store::contact_email(pool, &action.contact_id).await?;
        if current.as_deref().map(|e| e.to_lowercase()) != Some(payload.to.clone()) {
            blocked = Some("RECIPIENT_CHANGED");
        }
    }
    if blocked.is_none() && store::has_boundary(pool, &action.contact_id).await? {
        blocked = Some("BOUNDARY");
    }
    if blocked.is_none() {
        let fresh = recompute_hash(pool, &action).await?;
        if !action.context_hash.is_empty() && fresh != action.context_hash {
            blocked = Some("CONTEXT_CHANGED");
        }
    }

    if let Some(code) = blocked {
        sqlx::query(
            "UPDATE relationship_actions SET status = 'blocked', error_code = ?, approved_at = NULL, approved_revision = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(code)
        .bind(now_iso())
        .bind(&action.id)
        .execute(pool)
        .await?;
        store::log_activity(
            pool,
            Some(&action.id),
            action.workflow_id.as_deref(),
            &action.contact_id,
            "send_blocked",
            serde_json::json!({ "code": code }),
        )
        .await?;
        return Err(anyhow!("Sending was blocked: {}", code));
    }

    // Conditional claim: exactly one caller can win this transition.
    let claimed = sqlx::query(
        "UPDATE relationship_actions
         SET status = 'sending', send_started_at = ?, updated_at = ?
         WHERE id = ? AND status = 'approved' AND revision = ? AND approved_revision = ? AND send_started_at IS NULL",
    )
    .bind(now_iso())
    .bind(now_iso())
    .bind(&action.id)
    .bind(action.revision)
    .bind(action.revision)
    .execute(pool)
    .await?;

    if claimed.rows_affected() != 1 {
        return Err(anyhow!("This action was already claimed for sending"));
    }

    store::log_activity(
        pool,
        Some(&action.id),
        action.workflow_id.as_deref(),
        &action.contact_id,
        "send_started",
        serde_json::json!({ "to": payload.to }),
    )
    .await?;

    // Last look at pause/lock before the network call. Nothing has left the device
    // yet, so this is still safely reverting.
    let still_allowed = gate.allowed && !model::load(pool).await?.paused;
    if !still_allowed {
        sqlx::query(
            "UPDATE relationship_actions SET status = 'needs_review', approved_at = NULL, approved_revision = NULL, send_started_at = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(now_iso())
        .bind(&action.id)
        .execute(pool)
        .await?;
        return Err(anyhow!("The agent was paused before the email was sent"));
    }

    let provider: String = sqlx::query_scalar("SELECT provider FROM email_accounts WHERE id = ?")
        .bind(&payload.account_id)
        .fetch_optional(pool)
        .await?
        .unwrap_or_default();

    let result = send(payload.clone()).await;

    match result {
        Ok(receipt) => {
            sqlx::query(
                "UPDATE relationship_actions SET status = 'sent', provider_receipt = ?, updated_at = ? WHERE id = ?",
            )
            .bind(&receipt)
            .bind(now_iso())
            .bind(&action.id)
            .execute(pool)
            .await?;

            store::log_activity(
                pool,
                Some(&action.id),
                action.workflow_id.as_deref(),
                &action.contact_id,
                "send_succeeded",
                serde_json::json!({
                    "provider": provider,
                    // Outlook only acknowledges the request; it returns no durable
                    // message identity, unlike Gmail.
                    "receiptKind": if provider == "outlook" { "acknowledgement" } else { "message_id" },
                }),
            )
            .await?;
        }
        Err(e) => {
            sqlx::query(
                "UPDATE relationship_actions SET status = 'delivery_unknown', error_code = 'DELIVERY_UNKNOWN', updated_at = ? WHERE id = ?",
            )
            .bind(now_iso())
            .bind(&action.id)
            .execute(pool)
            .await?;
            store::log_activity(
                pool,
                Some(&action.id),
                action.workflow_id.as_deref(),
                &action.contact_id,
                "delivery_unknown",
                serde_json::json!({ "error": e.to_string().chars().take(200).collect::<String>() }),
            )
            .await?;
        }
    }

    Ok(DeliveryOutcome {
        action: get(pool, id).await?,
    })
}

/// Turns interrupted claims into `delivery_unknown`. Called at startup and on resume.
pub async fn recover_stale_sending(pool: &SqlitePool) -> Result<u64> {
    let cutoff = (chrono::Utc::now() - chrono::Duration::seconds(SENDING_STALE_SECONDS))
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    let recoverable = sqlx::query_as::<_, (String, Option<String>, String)>(
        "SELECT id, workflow_id, contact_id FROM relationship_actions
         WHERE status = 'sending' AND (send_started_at IS NULL OR send_started_at < ?)",
    )
    .bind(&cutoff)
    .fetch_all(pool)
    .await?;

    if recoverable.is_empty() {
        return Ok(0);
    }

    let updated = sqlx::query(
        "UPDATE relationship_actions SET status = 'delivery_unknown', error_code = 'DELIVERY_UNKNOWN', updated_at = ?
         WHERE status = 'sending' AND (send_started_at IS NULL OR send_started_at < ?)",
    )
    .bind(now_iso())
    .bind(&cutoff)
    .execute(pool)
    .await?;

    for (id, workflow_id, contact_id) in recoverable {
        store::log_activity(
            pool,
            Some(&id),
            workflow_id.as_deref(),
            &contact_id,
            "delivery_unknown",
            serde_json::json!({ "reason": "interrupted_send" }),
        )
        .await?;
    }

    Ok(updated.rows_affected())
}

/// Marks crash-interrupted preparation as blocked with an explicit retry.
pub async fn recover_stale_preparing(pool: &SqlitePool) -> Result<u64> {
    let cutoff = (chrono::Utc::now() - chrono::Duration::seconds(PREPARING_STALE_SECONDS))
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let updated = sqlx::query(
        "UPDATE relationship_actions SET status = 'blocked', error_code = 'PREPARATION_INTERRUPTED', updated_at = ?
         WHERE status = 'preparing' AND updated_at < ?",
    )
    .bind(now_iso())
    .bind(&cutoff)
    .execute(pool)
    .await?;
    Ok(updated.rows_affected())
}

/// Snoozed actions whose time has come return to review, never to approved.
pub async fn release_due_snoozes(pool: &SqlitePool) -> Result<u64> {
    let updated = sqlx::query(
        "UPDATE relationship_actions SET status = 'needs_review', snoozed_until = NULL, updated_at = ?
         WHERE status = 'snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= ?",
    )
    .bind(now_iso())
    .bind(now_iso())
    .execute(pool)
    .await?;
    Ok(updated.rows_affected())
}

/// Invalidates prepared work whose underlying conversation changed.
pub async fn invalidate_stale_context(pool: &SqlitePool) -> Result<u64> {
    let sql = format!(
        "{} WHERE status IN ('needs_review', 'approved')",
        store::ACTION_SELECT
    );
    let rows = sqlx::query(&sql).fetch_all(pool).await?;

    let mut invalidated = 0u64;
    for row in rows {
        let action = store::action_from_row(row)?;
        if action.kind != ActionKind::EmailDraft.as_str() || action.context_hash.is_empty() {
            continue;
        }
        let fresh = recompute_hash(pool, &action).await?;
        if fresh == action.context_hash {
            continue;
        }
        sqlx::query(
            "UPDATE relationship_actions SET status = 'needs_review', approved_at = NULL, approved_revision = NULL, context_hash = ?, error_code = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(&fresh)
        .bind(now_iso())
        .bind(&action.id)
        .execute(pool)
        .await?;
        invalidated += 1;
    }
    Ok(invalidated)
}
