-- Personal relationship agent: goals, workflows, memory, actions, activity, processing.
-- All timestamps are UTC RFC3339 text. Dedupe keys are UNIQUE so repeated ticks and
-- restarts cannot create duplicate actions or memory records.

CREATE TABLE IF NOT EXISTS relationship_goals (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    intent TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_workflows (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT,
    title TEXT NOT NULL,
    intent TEXT NOT NULL,
    spec_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    activated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_memory (
    id TEXT PRIMARY KEY NOT NULL,
    contact_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    origin TEXT NOT NULL,
    source_message_id TEXT,
    source_quote TEXT,
    due_at TEXT,
    status TEXT NOT NULL DEFAULT 'suggested',
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_actions (
    id TEXT PRIMARY KEY NOT NULL,
    workflow_id TEXT,
    contact_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    payload_json TEXT,
    evidence_json TEXT NOT NULL DEFAULT '{}',
    context_hash TEXT NOT NULL DEFAULT '',
    revision INTEGER NOT NULL DEFAULT 1,
    dedupe_key TEXT NOT NULL UNIQUE,
    due_at TEXT,
    snoozed_until TEXT,
    approved_at TEXT,
    approved_revision INTEGER,
    send_started_at TEXT,
    provider_receipt TEXT,
    error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_activity (
    id TEXT PRIMARY KEY NOT NULL,
    action_id TEXT,
    workflow_id TEXT,
    contact_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    detail_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_processing (
    id TEXT PRIMARY KEY NOT NULL,
    contact_id TEXT NOT NULL,
    input_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_relationship_workflows_status
    ON relationship_workflows(status);
CREATE INDEX IF NOT EXISTS idx_relationship_memory_contact_status
    ON relationship_memory(contact_id, status);
CREATE INDEX IF NOT EXISTS idx_relationship_actions_status_due
    ON relationship_actions(status, due_at);
CREATE INDEX IF NOT EXISTS idx_relationship_actions_contact
    ON relationship_actions(contact_id);
CREATE INDEX IF NOT EXISTS idx_relationship_activity_contact_time
    ON relationship_activity(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_relationship_processing_contact
    ON relationship_processing(contact_id);
