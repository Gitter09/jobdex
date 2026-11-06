//! Native IPC surface and background loop for the relationship agent.
//!
//! Core modules return `anyhow::Result`; the wrappers here translate to `AppError`.
//! Every mutating command notifies the frontend through `relationship_agent_changed`.

use crate::error::AppError;
use jobdex_core::db::Db;
use jobdex_core::email_service::EmailService;
use jobdex_core::relationship_agent::actions::{self, SendGate};
use jobdex_core::relationship_agent::memory;
use jobdex_core::relationship_agent::model;
use jobdex_core::relationship_agent::models::{self, *};
use jobdex_core::relationship_agent::runner;
use jobdex_core::relationship_agent::store;
use jobdex_core::relationship_agent::workflows;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

pub const CHANGED_EVENT: &str = "relationship_agent_changed";

// ===== Execution gate =====

/// Closed until an unlocked session is established. Background launches start closed.
static UNLOCKED: AtomicBool = AtomicBool::new(false);
static RUNNING: AtomicBool = AtomicBool::new(true);

static WAKE: LazyLock<tokio::sync::Notify> = LazyLock::new(tokio::sync::Notify::new);

pub fn is_unlocked() -> bool {
    UNLOCKED.load(Ordering::SeqCst)
}

/// Called by native unlock and by startup when no PIN is configured.
pub fn set_unlocked(unlocked: bool) {
    UNLOCKED.store(unlocked, Ordering::SeqCst);
    if unlocked {
        WAKE.notify_waiters();
    }
}

/// Wakes the loop so an approval is evaluated without waiting for the next minute.
pub fn wake() {
    WAKE.notify_waiters();
}

fn emit_changed(app: &AppHandle) {
    let _ = app.emit(CHANGED_EVENT, serde_json::json!({ "at": models::now_iso() }));
}

// ===== Background loop =====

pub fn start_runner(app: AppHandle, db: Db) {
    tauri::async_runtime::spawn(async move {
        // Startup: open the gate when this install has no lock PIN, and recover
        // anything a previous process left mid-flight.
        match has_lock_pin(db.pool()).await {
            Ok(false) if !std::env::args().any(|arg| arg == "--background") => set_unlocked(true),
            _ => {}
        }
        if let Err(error) = sqlx::query(
            "UPDATE relationship_actions SET status = 'delivery_unknown', error_code = 'DELIVERY_UNKNOWN' WHERE status = 'sending'",
        ).execute(db.pool()).await {
            eprintln!("Relationship delivery recovery failed: {}", error);
            return;
        }
        if let Err(error) = sqlx::query(
            "UPDATE relationship_actions SET status = 'blocked', error_code = 'PREPARATION_INTERRUPTED' WHERE status = 'preparing'",
        ).execute(db.pool()).await {
            eprintln!("Relationship preparation recovery failed: {}", error);
            return;
        }
        if let Err(error) = sqlx::query(
            "UPDATE relationship_processing SET status = 'failed', error_code = 'PREPARATION_INTERRUPTED' WHERE status = 'pending'",
        ).execute(db.pool()).await {
            eprintln!("Relationship extraction recovery failed: {}", error);
            return;
        }

        // Evaluate overdue work exactly once, not once per missed interval.
        run_once(&app, &db).await;

        let mut ticker = tokio::time::interval(Duration::from_secs(60));
        loop {
            if !RUNNING.load(Ordering::SeqCst) {
                break;
            }
            tokio::select! {
                _ = ticker.tick() => {}
                _ = WAKE.notified() => {}
            }
            run_once(&app, &db).await;
        }
    });
}

pub fn stop_runner() {
    RUNNING.store(false, Ordering::SeqCst);
    WAKE.notify_waiters();
}

async fn run_once(app: &AppHandle, db: &Db) {
    if !is_unlocked() {
        return;
    }
    match runner::tick(db.pool()).await {
        Ok(report) => {
            if report.changed() {
                emit_changed(app);
            }
        }
        Err(_e) => {
            #[cfg(debug_assertions)]
            eprintln!("[relationship-agent] tick failed: {}", _e);
        }
    }
}

async fn has_lock_pin(pool: &sqlx::SqlitePool) -> anyhow::Result<bool> {
    let stored: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'app_lock_pin_hash'")
            .fetch_optional(pool)
            .await?;
    Ok(stored.is_some())
}

// ===== Model configuration =====

#[tauri::command]
pub async fn configure_relationship_model(
    app: AppHandle,
    db: State<'_, Db>,
    config: RelationshipModelConfig,
    api_key: Option<String>,
) -> Result<ModelStatus, AppError> {
    let status = model::configure(db.pool(), config, api_key).await?;
    emit_changed(&app);
    wake();
    Ok(status)
}

#[tauri::command]
pub async fn get_relationship_model_status(db: State<'_, Db>) -> Result<ModelStatus, AppError> {
    Ok(model::status(db.pool()).await?)
}

#[tauri::command]
pub async fn test_relationship_model(
    app: AppHandle,
    db: State<'_, Db>,
) -> Result<ModelStatus, AppError> {
    let status = model::test_connection(db.pool()).await?;
    emit_changed(&app);
    wake();
    Ok(status)
}

#[tauri::command]
pub async fn disconnect_relationship_model(
    app: AppHandle,
    db: State<'_, Db>,
) -> Result<(), AppError> {
    model::disconnect(db.pool()).await?;
    emit_changed(&app);
    Ok(())
}

#[tauri::command]
pub async fn set_relationship_agent_paused(
    app: AppHandle,
    db: State<'_, Db>,
    paused: bool,
) -> Result<(), AppError> {
    model::set_paused(db.pool(), paused).await?;
    emit_changed(&app);
    if !paused {
        wake();
    }
    Ok(())
}

// ===== External API scope =====

#[tauri::command]
pub async fn get_api_relationship_scope(
    db: State<'_, Db>,
) -> Result<ApiRelationshipScope, AppError> {
    let scope = store::load_api_scope(db.pool()).await?;
    Ok(ApiRelationshipScope {
        access: scope.access.as_str().to_string(),
        allowed_contact_ids: scope.allowed_contact_ids,
        allow_contact_creation: scope.allow_contact_creation,
    })
}

#[tauri::command]
pub async fn set_api_relationship_scope(
    app: AppHandle,
    db: State<'_, Db>,
    access: AccessMode,
    allowed_contact_ids: Vec<String>,
    allow_contact_creation: bool,
) -> Result<ApiRelationshipScope, AppError> {
    let scope = store::save_api_scope(
        db.pool(),
        access,
        &allowed_contact_ids,
        allow_contact_creation,
    )
    .await?;
    emit_changed(&app);
    Ok(ApiRelationshipScope {
        access: scope.access.as_str().to_string(),
        allowed_contact_ids: scope.allowed_contact_ids,
        allow_contact_creation: scope.allow_contact_creation,
    })
}

// ===== Memory =====

#[tauri::command]
pub async fn list_relationship_memory(
    db: State<'_, Db>,
    contact_id: String,
) -> Result<Vec<RelationshipMemory>, AppError> {
    Ok(store::list_memory(db.pool(), &contact_id).await?)
}

#[tauri::command]
pub async fn refresh_relationship_memory(
    app: AppHandle,
    db: State<'_, Db>,
    contact_id: String,
) -> Result<Vec<RelationshipMemory>, AppError> {
    let memory = memory::refresh(db.pool(), &contact_id).await?;
    emit_changed(&app);
    Ok(memory)
}

#[tauri::command]
pub async fn create_relationship_memory(
    app: AppHandle,
    db: State<'_, Db>,
    contact_id: String,
    kind: MemoryKind,
    text: String,
    due_at: Option<String>,
) -> Result<RelationshipMemory, AppError> {
    let record = memory::create_user_memory(db.pool(), &contact_id, kind, &text, due_at.as_deref()).await?;
    emit_changed(&app);
    wake();
    Ok(record)
}

#[tauri::command]
pub async fn update_relationship_memory(
    app: AppHandle,
    db: State<'_, Db>,
    id: String,
    text: String,
    due_at: Option<String>,
    status: MemoryStatus,
) -> Result<RelationshipMemory, AppError> {
    let record = memory::update_memory(db.pool(), &id, &text, due_at.as_deref(), status).await?;
    emit_changed(&app);
    wake();
    Ok(record)
}

// ===== Goals and workflows =====

#[tauri::command]
pub async fn list_relationship_goals(db: State<'_, Db>) -> Result<Vec<RelationshipGoal>, AppError> {
    Ok(workflows::list_goals(db.pool()).await?)
}

#[tauri::command]
pub async fn save_relationship_goal(
    app: AppHandle,
    db: State<'_, Db>,
    id: Option<String>,
    title: String,
    intent: String,
    status: GoalStatus,
) -> Result<RelationshipGoal, AppError> {
    let goal = workflows::save_goal(db.pool(), id, title, intent, status).await?;
    emit_changed(&app);
    wake();
    Ok(goal)
}

#[tauri::command]
pub async fn list_relationship_workflows(
    db: State<'_, Db>,
) -> Result<Vec<RelationshipWorkflow>, AppError> {
    Ok(workflows::list_workflows(db.pool()).await?)
}

#[tauri::command]
pub async fn propose_relationship_workflow(
    db: State<'_, Db>,
    intent: String,
    contact_ids: Vec<String>,
    goal_id: Option<String>,
) -> Result<WorkflowProposal, AppError> {
    Ok(workflows::propose(db.pool(), intent, contact_ids, goal_id).await?)
}

#[tauri::command]
pub async fn save_relationship_workflow(
    app: AppHandle,
    db: State<'_, Db>,
    id: Option<String>,
    expected_revision: Option<i64>,
    title: String,
    intent: String,
    goal_id: Option<String>,
    spec: WorkflowSpec,
    status: WorkflowStatus,
) -> Result<RelationshipWorkflow, AppError> {
    let workflow = workflows::save_workflow(
        db.pool(),
        id,
        expected_revision,
        title,
        intent,
        goal_id,
        spec,
        status,
    )
    .await?;
    emit_changed(&app);
    wake();
    Ok(workflow)
}

// ===== Actions =====

#[tauri::command]
pub async fn list_relationship_actions(
    db: State<'_, Db>,
) -> Result<Vec<RelationshipAction>, AppError> {
    Ok(actions::list(db.pool()).await?)
}

#[tauri::command]
pub async fn get_relationship_activity(
    db: State<'_, Db>,
    contact_id: Option<String>,
) -> Result<Vec<RelationshipActivity>, AppError> {
    Ok(store::list_activity(db.pool(), contact_id.as_deref()).await?)
}

#[tauri::command]
pub async fn create_relationship_reminder(
    app: AppHandle,
    db: State<'_, Db>,
    contact_id: String,
    title: String,
    description: String,
    due_at: String,
) -> Result<RelationshipAction, AppError> {
    let action = actions::create_reminder(db.pool(), &contact_id, title, description, due_at).await?;
    emit_changed(&app);
    Ok(action)
}

#[tauri::command]
pub async fn edit_relationship_draft(
    app: AppHandle,
    db: State<'_, Db>,
    id: String,
    expected_revision: i64,
    payload: EmailDraftPayload,
) -> Result<RelationshipAction, AppError> {
    let action = actions::edit_draft(db.pool(), &id, expected_revision, payload).await?;
    emit_changed(&app);
    Ok(action)
}

#[tauri::command]
pub async fn review_relationship_action(
    app: AppHandle,
    db: State<'_, Db>,
    id: String,
    expected_revision: i64,
    decision: ReviewDecision,
    snoozed_until: Option<String>,
) -> Result<RelationshipAction, AppError> {
    let action = actions::review(db.pool(), &id, expected_revision, decision, snoozed_until).await?;
    emit_changed(&app);
    Ok(action)
}

#[tauri::command]
pub async fn retry_relationship_action(
    app: AppHandle,
    db: State<'_, Db>,
    id: String,
) -> Result<RelationshipAction, AppError> {
    let action = actions::retry(db.pool(), &id).await?;
    emit_changed(&app);
    wake();
    Ok(action)
}

/// Native-only delivery of an approved action. Claims exactly once, then calls the
/// provider a single time.
#[tauri::command]
pub async fn send_relationship_action(
    app: AppHandle,
    db: State<'_, Db>,
    id: String,
) -> Result<RelationshipAction, AppError> {
    let service = EmailService::new(db.inner().clone());
    if !is_unlocked() {
        return Err(AppError::Validation("Unlock JobDex before sending".into()));
    }
    let action = actions::get(db.pool(), &id).await?;
    let payload = action.email_payload()?;
    let sync = service.sync_account(&payload.account_id).await?;
    if sync.token_expired || sync.partial || sync.error.is_some() {
        return Err(AppError::Validation("Mailbox sync is incomplete; sending is blocked".into()));
    }
    let outcome = actions::claim_and_send(
        db.pool(),
        &id,
        |payload| async move {
            if !is_unlocked() {
                return Err(anyhow::anyhow!("JobDex locked before provider delivery"));
            }
            service
                .send_email(
                    &payload.account_id,
                    &payload.to,
                    &payload.subject,
                    &payload.body,
                    Vec::new(),
                )
                .await
        },
        SendGate {
            allowed: is_unlocked(),
        },
    )
    .await;
    emit_changed(&app);
    match outcome {
        Ok(outcome) => Ok(outcome.action),
        Err(e) => Err(AppError::Internal(e.to_string())),
    }
}

