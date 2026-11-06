import type {
    ApiRelationshipScope,
    Contact,
    ContactEvent,
    EmailAccount,
    EmailMessage,
    ModelStatus,
    RelationshipAction,
    RelationshipActivity,
    RelationshipGoal,
    RelationshipMemory,
    RelationshipWorkflow,
    Status,
    Tag,
    WorkflowSpec,
} from "@/types/crm";

export interface BrowserState {
    schemaVersion: 1;
    contacts: Contact[];
    statuses: Status[];
    tags: Tag[];
    emailAccounts: EmailAccount[];
    messages: (EmailMessage & { contactId: string; accountId: string })[];
    actions: RelationshipAction[];
    memory: RelationshipMemory[];
    workflows: RelationshipWorkflow[];
    goals: RelationshipGoal[];
    activity: RelationshipActivity[];
    contactEvents: ContactEvent[];
    settings: Record<string, string>;
    modelStatus: ModelStatus;
    apiScope: ApiRelationshipScope;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Offset from `now` in ms, serialized as UTC so fixtures do not depend on the local timezone. */
const ts = (now: Date, offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();

const alexEmail = "alex.morgan@example.invalid";
const blairEmail = "blair.chen@example.invalid";
const accountEmail = "me@example.invalid";
const introQuote = "I can introduce you after the launch.";

export function createBrowserState(now: Date = new Date()): BrowserState {
    const tags: Tag[] = [
        {
            id: "browser-tag-former-colleague",
            name: "Former colleague",
            color: "#8b5cf6",
            created_at: ts(now, -120 * DAY),
        },
        {
            id: "browser-tag-collaborator",
            name: "Collaborator",
            color: "#3b5bdb",
            created_at: ts(now, -120 * DAY),
        },
    ];

    const contacts: Contact[] = [
        {
            id: "browser-alex",
            first_name: "Alex",
            last_name: "Morgan",
            title: "Product Lead",
            company: "Northwind Labs",
            location: "Berlin",
            email: alexEmail,
            status_id: "stat-connected",
            status_label: "Connected",
            status_color: "#3b5bdb",
            last_contacted_date: ts(now, -20 * DAY),
            summary: "Former colleague from the platform team. Kept in touch after both changed roles.",
            created_at: ts(now, -110 * DAY),
            updated_at: ts(now, -20 * DAY),
            tags: [tags[0]],
        },
        {
            id: "browser-blair",
            first_name: "Blair",
            last_name: "Chen",
            title: "Independent Designer",
            company: "Studio Chen",
            location: "Lisbon",
            email: blairEmail,
            status_id: "stat-new",
            status_label: "New",
            status_color: "#64748b",
            last_contacted_date: ts(now, -10 * DAY),
            summary: "Met through a joint workshop; interested in collaborating on a small tool.",
            created_at: ts(now, -30 * DAY),
            updated_at: ts(now, -10 * DAY),
            tags: [tags[1]],
        },
    ];

    const statuses: Status[] = [
        { id: "stat-new", label: "New", color: "#64748b", is_default: true, position: 0 },
        { id: "stat-connected", label: "Connected", color: "#3b5bdb", is_default: false, position: 1 },
    ];

    const emailAccounts: EmailAccount[] = [
        {
            id: "browser-account",
            provider: "gmail",
            email: accountEmail,
            last_synced_at: ts(now, -2 * HOUR),
            created_at: ts(now, -60 * DAY),
            updated_at: ts(now, -2 * HOUR),
        },
    ];

    const messages: BrowserState["messages"] = [
        {
            id: "browser-message-1",
            contactId: "browser-alex",
            accountId: "browser-account",
            thread_id: "browser-thread-alex",
            from_email: alexEmail,
            to_email: accountEmail,
            subject: "Re: catch-up after the launch",
            body: `Good to hear from you. ${introQuote} Let's find a time once things settle.`,
            sent_at: ts(now, -20 * DAY),
            status: "received",
            created_at: ts(now, -20 * DAY),
        },
        {
            id: "browser-message-2",
            contactId: "browser-blair",
            accountId: "browser-account",
            thread_id: "browser-thread-blair",
            from_email: blairEmail,
            to_email: accountEmail,
            subject: "Workshop follow-up",
            body: "Sharing the notes we talked about. No rush on your side.",
            sent_at: ts(now, -10 * DAY),
            status: "received",
            created_at: ts(now, -10 * DAY),
        },
    ];

    const memory: RelationshipMemory[] = [
        {
            id: "browser-memory-1",
            contactId: "browser-alex",
            kind: "commitment",
            text: "Alex said they can introduce you after the launch. No date was given.",
            origin: "inference",
            sourceMessageId: "browser-message-1",
            sourceQuote: introQuote,
            status: "suggested",
            createdAt: ts(now, -20 * DAY),
            updatedAt: ts(now, -20 * DAY),
        },
        {
            id: "browser-memory-2",
            contactId: "browser-alex",
            kind: "context",
            text: "Worked together on the platform team; prefers a short note over a scheduled call.",
            origin: "user",
            status: "confirmed",
            createdAt: ts(now, -19 * DAY),
            updatedAt: ts(now, -19 * DAY),
        },
    ];

    const spec: WorkflowSpec = {
        schemaVersion: 1,
        contactIds: ["browser-alex"],
        accountId: "browser-account",
        purpose: "Stay in touch with a former colleague and follow up on the introduction they offered.",
        tone: "Warm, brief, personal.",
        rules: [{ id: "browser-rule-cadence", trigger: "cadence", days: 45, action: "email_draft" }],
    };

    const workflows: RelationshipWorkflow[] = [
        {
            id: "browser-workflow-1",
            title: "Reconnect with Alex",
            intent: "Help me reconnect with Alex every 45 days and draft a short personal note; never send automatically.",
            spec,
            revision: 1,
            status: "draft",
            createdAt: ts(now, -3 * DAY),
            updatedAt: ts(now, -3 * DAY),
        },
    ];

    const actions: RelationshipAction[] = [
        {
            id: "browser-action-reminder",
            contactId: "browser-alex",
            kind: "reminder",
            status: "needs_review",
            payload: {
                title: "Ask Alex how the launch landed",
                description: "Short check-in; mention the introduction only if they bring it up.",
            },
            evidence: { sourceMessageIds: [], sourceQuotes: [], memoryIds: ["browser-memory-2"], rationale: "Manual reminder created by you." },
            contextHash: "browser-hash-reminder",
            revision: 1,
            dueAt: ts(now, -2 * DAY),
            createdAt: ts(now, -5 * DAY),
            updatedAt: ts(now, -5 * DAY),
        },
        {
            id: "browser-action-reminder-future",
            contactId: "browser-blair",
            kind: "reminder",
            status: "needs_review",
            payload: {
                title: "Send Blair the workshop notes",
                description: "Reply with the two links discussed at the workshop.",
            },
            evidence: { sourceMessageIds: ["browser-message-2"], sourceQuotes: [], memoryIds: [], rationale: "Manual reminder created by you." },
            contextHash: "browser-hash-reminder-future",
            revision: 1,
            dueAt: ts(now, 3 * DAY),
            createdAt: ts(now, -1 * DAY),
            updatedAt: ts(now, -1 * DAY),
        },
        {
            id: "browser-action-draft",
            workflowId: "browser-workflow-1",
            contactId: "browser-alex",
            kind: "email_draft",
            status: "needs_review",
            payload: {
                accountId: "browser-account",
                to: alexEmail,
                subject: "Catching up",
                body: "Hi Alex,\n\nIt's been a while since we last talked. I'd enjoy hearing how the launch went and what you're working on now.\n\nNo rush — happy to keep it to a short note.\n\nBest,\nMe",
            },
            evidence: {
                sourceMessageIds: ["browser-message-1"],
                sourceQuotes: [introQuote],
                memoryIds: ["browser-memory-2"],
                rationale: "Cadence of 45 days elapsed since the last exchange; draft stays plain text and personal.",
            },
            contextHash: "browser-hash-draft",
            revision: 1,
            dueAt: ts(now, -1 * DAY),
            createdAt: ts(now, -1 * DAY),
            updatedAt: ts(now, -1 * DAY),
        },
        {
            id: "browser-action-blocked",
            workflowId: "browser-workflow-1",
            contactId: "browser-alex",
            kind: "email_draft",
            status: "blocked",
            payload: {
                accountId: "browser-account",
                to: alexEmail,
                subject: "Quick note",
                body: "Hi Alex,\n\nThinking of you — hope things are going well.\n\nBest,\nMe",
            },
            evidence: {
                sourceMessageIds: ["browser-message-1"],
                sourceQuotes: [introQuote],
                memoryIds: ["browser-memory-1"],
                rationale: "Draft preparation needs a configured model.",
            },
            contextHash: "browser-hash-blocked",
            revision: 1,
            errorCode: "MODEL_NOT_CONFIGURED",
            createdAt: ts(now, -1 * DAY),
            updatedAt: ts(now, -1 * DAY),
        },
        {
            id: "browser-action-delivery-unknown",
            workflowId: "browser-workflow-1",
            contactId: "browser-alex",
            kind: "email_draft",
            status: "delivery_unknown",
            payload: {
                accountId: "browser-account",
                to: alexEmail,
                subject: "Reconnecting",
                body: "Hi Alex,\n\nA quick note to say hello and see how you're doing.\n\nBest,\nMe",
            },
            evidence: {
                sourceMessageIds: ["browser-message-1"],
                sourceQuotes: [introQuote],
                memoryIds: ["browser-memory-2"],
                rationale: "Approved draft; delivery outcome was not confirmed by the provider.",
            },
            contextHash: "browser-hash-unknown",
            revision: 2,
            approvedAt: ts(now, -1 * DAY),
            approvedRevision: 2,
            sendStartedAt: ts(now, -1 * DAY),
            errorCode: "PROVIDER_CONNECTION_LOST",
            createdAt: ts(now, -2 * DAY),
            updatedAt: ts(now, -1 * DAY),
        },
    ];

    const activity: RelationshipActivity[] = [
        {
            id: "browser-activity-1",
            actionId: "browser-action-draft",
            workflowId: "browser-workflow-1",
            contactId: "browser-alex",
            eventType: "action_created",
            detail: { status: "needs_review" },
            createdAt: ts(now, -1 * DAY),
        },
        {
            id: "browser-activity-2",
            actionId: "browser-action-delivery-unknown",
            workflowId: "browser-workflow-1",
            contactId: "browser-alex",
            eventType: "delivery_unknown",
            detail: { errorCode: "PROVIDER_CONNECTION_LOST" },
            createdAt: ts(now, -1 * DAY),
        },
        {
            id: "browser-activity-3",
            actionId: "browser-action-reminder-future",
            contactId: "browser-blair",
            eventType: "action_created",
            detail: { status: "needs_review" },
            createdAt: ts(now, -1 * DAY),
        },
    ];

    return {
        schemaVersion: 1,
        contacts,
        statuses,
        tags,
        emailAccounts,
        messages,
        actions,
        memory,
        workflows,
        goals: [],
        activity,
        contactEvents: [],
        settings: {
            onboarding_complete: "true",
            theme_mode: "system",
            last_seen_version: "0.2.1-browser",
        },
        modelStatus: {
            configured: false,
            connectionVerified: false,
            enabled: false,
            paused: true,
            baseUrl: "https://api.openai.com/v1",
            model: "",
            requestsToday: 0,
            dailyRequestLimit: 20,
            allowedContactIds: [],
        },
        apiScope: {
            access: "read",
            allowedContactIds: [],
            allowContactCreation: false,
        },
    };
}
