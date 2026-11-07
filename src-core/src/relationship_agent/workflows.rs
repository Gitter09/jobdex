//! Goals and workflow compilation.
//!
//! Natural-language intent is compiled into a `WorkflowSpec` the user reviews and
//! edits. Intent never executes directly, and the model may only use the fixed
//! trigger/action vocabulary and explicitly supplied contacts.

use super::model;
use super::models::*;
use super::store;
use anyhow::{anyhow, Result};
use serde::Deserialize;
use sqlx::SqlitePool;

pub const REVISION_CONFLICT: &str = "RELATIONSHIP_REVISION_CONFLICT";

// ===== Goals =====

pub async fn list_goals(pool: &SqlitePool) -> Result<Vec<RelationshipGoal>> {
    store::list_goals(pool).await
}

pub async fn save_goal(
    pool: &SqlitePool,
    id: Option<String>,
    title: String,
    intent: String,
    status: GoalStatus,
) -> Result<RelationshipGoal> {
    let title = validate_title(&title)?;
    let intent = validate_long_text(&intent, "intent")?;
    let now = now_iso();

    let goal_id = match id {
        Some(existing) => {
            let current = store::get_goal(pool, &existing)
                .await?
                .ok_or_else(|| anyhow!("Unknown goal"))?;
            sqlx::query(
                "UPDATE relationship_goals SET title = ?, intent = ?, status = ?, updated_at = ? WHERE id = ?",
            )
            .bind(&title)
            .bind(&intent)
            .bind(status.as_str())
            .bind(&now)
            .bind(&current.id)
            .execute(pool)
            .await?;

            // A paused or archived goal pauses everything beneath it and clears
            // approvals. Reactivating never silently resumes those workflows.
            if status != GoalStatus::Active {
                sqlx::query(
                    "UPDATE relationship_workflows SET status = 'paused', updated_at = ? WHERE goal_id = ? AND status = 'active'",
                )
                .bind(&now)
                .bind(&current.id)
                .execute(pool)
                .await?;
                sqlx::query(
                    "UPDATE relationship_actions SET status = 'needs_review', approved_at = NULL, approved_revision = NULL, updated_at = ?
                     WHERE status = 'approved' AND workflow_id IN (SELECT id FROM relationship_workflows WHERE goal_id = ?)",
                )
                .bind(&now)
                .bind(&current.id)
                .execute(pool)
                .await?;
            }
            current.id
        }
        None => {
            let new_id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO relationship_goals (id, title, intent, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(&new_id)
            .bind(&title)
            .bind(&intent)
            .bind(status.as_str())
            .bind(&now)
            .bind(&now)
            .execute(pool)
            .await?;
            new_id
        }
    };

    store::get_goal(pool, &goal_id)
        .await?
        .ok_or_else(|| anyhow!("Goal disappeared after save"))
}

// ===== Workflows =====

pub async fn list_workflows(pool: &SqlitePool) -> Result<Vec<RelationshipWorkflow>> {
    store::list_workflows(pool).await
}

/// Checks the non-structural parts of a spec: contacts and account must exist.
async fn validate_spec_references(pool: &SqlitePool, spec: &WorkflowSpec) -> Result<()> {
    for id in &spec.contact_ids {
        if !store::contact_exists(pool, id).await? {
            return Err(anyhow!("Unknown contact in workflow scope: {}", id));
        }
    }
    if spec.requires_sending_account() {
        let account = spec
            .account_id
            .as_deref()
            .ok_or_else(|| anyhow!("Email drafting requires a sending account"))?;
        let found: Option<String> =
            sqlx::query_scalar("SELECT id FROM email_accounts WHERE id = ?")
                .bind(account)
                .fetch_optional(pool)
                .await?;
        if found.is_none() {
            return Err(anyhow!("Unknown sending account"));
        }
    }
    Ok(())
}

pub async fn save_workflow(
    pool: &SqlitePool,
    id: Option<String>,
    expected_revision: Option<i64>,
    title: String,
    intent: String,
    goal_id: Option<String>,
    spec: WorkflowSpec,
    status: WorkflowStatus,
) -> Result<RelationshipWorkflow> {
    let title = validate_title(&title)?;
    let intent = validate_long_text(&intent, "intent")?;
    spec.validate()?;

    if let Some(goal) = &goal_id {
        if store::get_goal(pool, goal).await?.is_none() {
            return Err(anyhow!("Unknown goal"));
        }
    }

    if status == WorkflowStatus::Active {
        if spec.rules.is_empty() {
            return Err(anyhow!("Add at least one timing rule before activating a workflow"));
        }
        if spec.contact_ids.is_empty() {
            return Err(anyhow!("A workflow with no contacts cannot be activated"));
        }
        validate_spec_references(pool, &spec).await?;
    }

    let now = now_iso();
    let current = match id.as_deref() {
        Some(existing) => Some(store::get_workflow(pool, existing).await?
            .ok_or_else(|| anyhow!("Unknown workflow"))?),
        None => None,
    };
    let mut tx = pool.begin().await?;

    let workflow_id = match id {
        Some(_) => {
            let current = current.ok_or_else(|| anyhow!("Unknown workflow"))?;

            if let Some(expected) = expected_revision {
                if expected != current.revision {
                    return Err(anyhow!(REVISION_CONFLICT));
                }
            }

            let activated_at = match (&current.activated_at, status) {
                (Some(stamp), _) => Some(stamp.clone()),
                (None, WorkflowStatus::Active) => Some(now.clone()),
                (None, _) => None,
            };

            let updated = sqlx::query(
                "UPDATE relationship_workflows
                 SET goal_id = ?, title = ?, intent = ?, spec_json = ?, revision = revision + 1,
                     status = ?, activated_at = ?, updated_at = ?
                 WHERE id = ? AND revision = ?",
            )
            .bind(&goal_id)
            .bind(&title)
            .bind(&intent)
            .bind(serde_json::to_string(&spec)?)
            .bind(status.as_str())
            .bind(&activated_at)
            .bind(&now)
            .bind(&current.id)
            .bind(current.revision)
            .execute(&mut *tx)
            .await?;
            if updated.rows_affected() != 1 {
                return Err(anyhow!(REVISION_CONFLICT));
            }

            // The scope, timing and wording may all have changed: nothing prepared
            // under the old revision may be sent, and everything is regenerated.
            sqlx::query(
                "UPDATE relationship_actions SET status = 'dismissed', approved_at = NULL, approved_revision = NULL, updated_at = ?
                 WHERE workflow_id = ? AND status IN ('preparing', 'needs_review', 'snoozed', 'approved', 'blocked')",
            )
            .bind(&now)
            .bind(&current.id)
            .execute(&mut *tx)
            .await?;

            current.id
        }
        None => {
            let new_id = uuid::Uuid::new_v4().to_string();
            let activated_at = (status == WorkflowStatus::Active).then(|| now.clone());
            sqlx::query(
                "INSERT INTO relationship_workflows
                    (id, goal_id, title, intent, spec_json, revision, status, activated_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)",
            )
            .bind(&new_id)
            .bind(&goal_id)
            .bind(&title)
            .bind(&intent)
            .bind(serde_json::to_string(&spec)?)
            .bind(status.as_str())
            .bind(&activated_at)
            .bind(&now)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
            new_id
        }
    };

    tx.commit().await?;
    store::get_workflow(pool, &workflow_id)
        .await?
        .ok_or_else(|| anyhow!("Workflow disappeared after save"))
}

// ===== Proposal =====

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawProposal {
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    spec: Option<serde_json::Value>,
    #[serde(default)]
    questions: Vec<String>,
    #[serde(default)]
    unsupported_requests: Vec<String>,
}

const PROPOSAL_SYSTEM: &str = "You convert a person's relationship intent into a bounded workflow specification. Return compact JSON only:\n\
{\"title\":\"...\",\"spec\":{\"schemaVersion\":1,\"contactIds\":[\"<id>\"],\"accountId\":null,\"purpose\":\"...\",\"tone\":\"...\",\"rules\":[{\"id\":\"r1\",\"trigger\":\"cadence\",\"days\":45,\"action\":\"email_draft\"}]},\"questions\":[],\"unsupportedRequests\":[]}\n\
Allowed trigger values: cadence (requires days 1-365), commitment_due (must omit days), unanswered (requires days 1-365).\n\
Allowed action values: reminder, email_draft.\n\
contactIds MUST come from the provided contact list. Never invent identities, emails or accounts.\n\
At most 5 rules and 25 contacts. Never add fields outside this schema.\n\
You cannot send email, use tools, browse, or contact anyone. Sending always requires the user's explicit approval, so never promise automatic sending.\n\
Put anything outside this vocabulary (other apps or networks, deleting data, setting reminders for people not in the list, automatic sending) into unsupportedRequests, and ask about missing scope or timing in questions.\n\
If the intent is complete and supported, return an empty unsupportedRequests array.";

pub async fn propose(
    pool: &SqlitePool,
    intent: String,
    contact_ids: Vec<String>,
    goal_id: Option<String>,
) -> Result<WorkflowProposal> {
    let intent = validate_long_text(&intent, "intent")?;
    if intent.is_empty() {
        return Err(anyhow!("Describe what you want before asking for a proposal"));
    }
    if let Some(goal) = &goal_id {
        if store::get_goal(pool, goal).await?.is_none() {
            return Err(anyhow!("Unknown goal"));
        }
    }

    let mut supplied = Vec::new();
    for id in &contact_ids {
        let id = validate_id(id, "contactIds")?;
        if !store::contact_exists(pool, &id).await? {
            return Err(anyhow!("Unknown contact: {}", id));
        }
        supplied.push(id);
    }
    if supplied.len() > MAX_CONTACTS {
        return Err(anyhow!("Select at most {} contacts", MAX_CONTACTS));
    }

    let client = match model::client_for_use(pool).await? {
        Some(client) => client,
        None => {
            return Ok(WorkflowProposal {
                spec: None,
                title: None,
                questions: vec![
                    "AI is not configured, so describe the scope and timing yourself. Nothing runs until you activate the workflow."
                        .to_string(),
                ],
                unsupported_requests: Vec::new(),
            })
        }
    };
    let consent = model::load(pool).await?;
    if supplied.iter().any(|id| !model::is_consented(&consent, id)) {
        return Err(anyhow!("Selected people require disclosure consent before an AI proposal"));
    }

    let mut contacts_block = String::new();
    for id in &supplied {
        let row = sqlx::query_as::<_, (String, String, Option<String>, Option<String>)>(
            "SELECT first_name, last_name, email, company FROM contacts WHERE id = ?",
        )
        .bind(id)
        .fetch_one(pool)
        .await?;
        contacts_block.push_str(&format!(
            "- id={} name=\"{} {}\" email=\"{}\" company=\"{}\"\n",
            id,
            row.0,
            row.1,
            row.2.unwrap_or_default(),
            row.3.unwrap_or_default()
        ));
    }

    model::reserve_request(pool).await?;

    let user = format!("Intent: {}\n\nSelected contacts:\n{}", intent, contacts_block);
    let raw: RawProposal = match client
        .complete_json(PROPOSAL_SYSTEM, &user, 1_200)
        .await
    {
        Ok(value) => value,
        Err(e) => {
            model::record_error(pool, &e.to_string()).await;
            return Err(e);
        }
    };
    model::clear_error(pool).await;

    let mut questions: Vec<String> = raw
        .questions
        .into_iter()
        .map(|q| q.trim().to_string())
        .filter(|q| !q.is_empty())
        .take(8)
        .collect();
    let mut unsupported: Vec<String> = raw
        .unsupported_requests
        .into_iter()
        .map(|q| q.trim().to_string())
        .filter(|q| !q.is_empty())
        .take(8)
        .collect();

    let spec = match raw.spec {
        Some(value) => match serde_json::from_value::<WorkflowSpec>(value) {
            Ok(mut candidate) => {
                // The model may only scope work to contacts the user actually gave it.
                let before = candidate.contact_ids.len();
                candidate
                    .contact_ids
                    .retain(|id| supplied.iter().any(|s| s == id));
                candidate.contact_ids.dedup();
                if candidate.contact_ids.len() != before {
                    questions.push(
                        "Some contacts in the proposal were not in your selection and were removed."
                            .to_string(),
                    );
                }
                if let Some(account) = candidate.account_id.clone() {
                    let known: Option<String> =
                        sqlx::query_scalar("SELECT id FROM email_accounts WHERE id = ?")
                            .bind(&account)
                            .fetch_optional(pool)
                            .await?;
                    if known.is_none() {
                        candidate.account_id = None;
                        questions.push(
                            "Choose which email account should hold drafts for this workflow."
                                .to_string(),
                        );
                    }
                }
                match candidate.validate() {
                    Ok(()) => Some(candidate),
                    Err(e) => {
                        questions.push(format!(
                            "The proposed timing or scope was not valid ({}). Adjust it below.",
                            e
                        ));
                        None
                    }
                }
            }
            Err(_) => {
                questions.push(
                    "The proposal did not match the supported workflow format. Build it below."
                        .to_string(),
                );
                None
            }
        },
        None => None,
    };

    Ok(WorkflowProposal {
        spec,
        title: raw
            .title
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty() && t.chars().count() <= MAX_TITLE_CHARS),
        questions,
        unsupported_requests: unsupported.drain(..).collect(),
    })
}
