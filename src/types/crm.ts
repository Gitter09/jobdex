export interface ToolStatus {
    tool: string;
    label: string;
    isDetected: boolean;
    isConfigured: boolean;
    transport: "stdio" | "sse";
    configPath?: string;
}

export interface Contact {
    id: string;
    // Base Info
    first_name: string;
    last_name: string;
    title?: string;
    company?: string;
    location?: string;

    email?: string;
    linkedin_url?: string;
    company_website?: string;

    status_id?: string;
    status_label?: string;
    status_color?: string;

    last_contacted_date?: string; // ISO string
    next_contact_date?: string;
    effective_next_date?: string; // Earliest of manual date or next scheduled event
    next_contact_event?: string;
    cadence_stage?: number;

    summary?: string;
    created_at: string;
    updated_at: string;
    tags?: Tag[];
}

export interface Status {
    id: string;
    label: string;
    color: string;
    is_default: boolean;
    position: number;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    created_at: string;
}

export interface EmailAccount {
    id: string;
    provider: string;
    email: string;
    expires_at?: number;
    last_synced_at?: string;
    created_at: string;
    updated_at: string;
}

export interface EmailMessage {
    id: string;
    thread_id: string;
    from_email: string;
    to_email: string;
    subject?: string;
    body?: string;
    html_body?: string;
    sent_at?: string;
    status?: string;
    provider_message_id?: string;
    manually_assigned?: number;
    created_at: string;
}

export interface EmailAttachment {
    id: string;
    messageId: string;
    filename: string;
    contentType: string;
    fileSize: number;
    filePath: string;
    createdAt: string;
}

export interface ContactEvent {
    id: string;
    contact_id: string;
    title: string;
    description?: string;
    event_at: string;
    created_at: string;
    updated_at: string;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject?: string;
    body?: string;
    attachment_paths: string[];
    created_at: string;
    updated_at: string;
}

export interface ContactFile {
    id: string;
    contactId: string;
    filename: string;
    filePath: string;
    createdAt: string;
}

export interface EmailSignature {
    id: string;
    name: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface SyncResult {
    account_id: string;
    account_email: string;
    provider: string;
    synced_count: number;
    skipped_count: number;
    token_expired: boolean;
    partial?: boolean;
    error?: string;
}

export interface ImportPreview {
    headers: string[];
    total_rows: number;
}

export interface ImportAnalysis {
    total_detected: number;
    new_count: number;
    duplicate_count: number;
}

export interface ImportResult {
    imported: number;
    skipped: number;
    merged: number;
    failed: number;
    errors: string[];
}

export interface ColumnMapping {
    first_name: number | null;
    last_name: number | null;
    email: number | null;
    linkedin_url: number | null;
    company: number | null;
    title: number | null;
    location: number | null;
    company_website: number | null;
    intelligence_summary: number[];
}

export interface ImportSummary {
    contactsAdded: number;
    contactsUpdated: number;
    statusesAdded: number;
    tagsAdded: number;
    eventsRestored: number;
    templatesRestored: number;
    signaturesRestored: number;
    scheduledRestored: number;
}

export interface ScheduledEmail {
    id: string;
    contactId: string;
    contactFirstName: string;
    contactLastName: string;
    accountId: string;
    subject: string;
    body: string;
    scheduledAt: string; // ISO string
    status: string; // 'pending', 'sending', 'sent', 'failed', 'delivery_unknown'
    errorMessage?: string;
    sendStartedAt?: string;
    providerReceipt?: string;
    createdAt: string;
    attachmentPaths?: string[];
}

export interface ApiStatus {
    enabled: boolean;
    port: number;
    keySet: boolean;
}

// ===== Relationship agent =====
// Matched to the Rust wire structs in `src-core/src/relationship_agent/models.rs`
// (all camelCase, enum values snake_case).

export type GoalStatus = "active" | "paused" | "archived";
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type MemoryKind = "context" | "commitment" | "boundary";
export type MemoryOrigin = "user" | "source" | "inference";
export type MemoryStatus = "suggested" | "confirmed" | "dismissed" | "superseded";
export type ActionKind = "reminder" | "email_draft";
export type ActionStatus =
    | "preparing"
    | "needs_review"
    | "snoozed"
    | "approved"
    | "sending"
    | "sent"
    | "delivery_unknown"
    | "blocked"
    | "dismissed"
    | "done";
export type RuleTrigger = "cadence" | "commitment_due" | "unanswered";
export type RuleAction = "reminder" | "email_draft";
export type ReviewDecision = "approve" | "dismiss" | "done" | "snooze";
export type AccessMode = "read" | "organize";

export interface RelationshipRule {
    id: string;
    trigger: RuleTrigger;
    days?: number;
    action: RuleAction;
}

export interface WorkflowSpec {
    schemaVersion: 1;
    contactIds: string[];
    accountId?: string;
    purpose: string;
    tone: string;
    rules: RelationshipRule[];
}

export interface RelationshipGoal {
    id: string;
    title: string;
    intent: string;
    status: GoalStatus;
    createdAt: string;
    updatedAt: string;
}

export interface RelationshipWorkflow {
    id: string;
    goalId?: string;
    title: string;
    intent: string;
    spec: WorkflowSpec;
    revision: number;
    status: WorkflowStatus;
    activatedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RelationshipMemory {
    id: string;
    contactId: string;
    kind: MemoryKind;
    text: string;
    origin: MemoryOrigin;
    sourceMessageId?: string;
    sourceQuote?: string;
    dueAt?: string;
    status: MemoryStatus;
    createdAt: string;
    updatedAt: string;
}

export interface EmailDraftPayload {
    accountId: string;
    to: string;
    subject: string;
    body: string;
}

export interface ReminderPayload {
    title: string;
    description: string;
}

export interface ActionEvidence {
    sourceMessageIds: string[];
    sourceQuotes: string[];
    memoryIds: string[];
    rationale: string;
}

export interface RelationshipAction {
    id: string;
    workflowId?: string;
    contactId: string;
    kind: ActionKind;
    status: ActionStatus;
    payload?: EmailDraftPayload | ReminderPayload;
    evidence: ActionEvidence;
    contextHash: string;
    revision: number;
    dueAt?: string;
    snoozedUntil?: string;
    approvedAt?: string;
    approvedRevision?: number;
    sendStartedAt?: string;
    providerReceipt?: string;
    errorCode?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RelationshipActivity {
    id: string;
    actionId?: string;
    workflowId?: string;
    contactId: string;
    eventType: string;
    detail: unknown;
    createdAt: string;
}

export interface WorkflowProposal {
    spec?: WorkflowSpec;
    title?: string;
    questions: string[];
    unsupportedRequests: string[];
}

export interface RelationshipModelConfig {
    baseUrl: string;
    model: string;
    enabled: boolean;
    dailyRequestLimit: number;
    allowedContactIds: string[];
}

export interface ModelStatus {
    configured: boolean;
    connectionVerified: boolean;
    enabled: boolean;
    paused: boolean;
    baseUrl: string;
    model: string;
    requestsToday: number;
    dailyRequestLimit: number;
    allowedContactIds: string[];
    lastError?: string;
}

export interface ApiRelationshipScope {
    access: AccessMode;
    allowedContactIds: string[];
    allowContactCreation: boolean;
}

export function isEmailDraft(action: RelationshipAction): action is RelationshipAction & { payload: EmailDraftPayload } {
    return action.kind === "email_draft" && !!action.payload && "to" in action.payload;
}

export function isReminder(action: RelationshipAction): action is RelationshipAction & { payload: ReminderPayload } {
    return action.kind === "reminder" && !!action.payload && "title" in action.payload;
}
