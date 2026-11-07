// Development-only UI data. This is not a Rust substitute or a delivery engine.
// Vite aliases this module into browser serve mode only; production keeps Tauri.
import type {
    Contact, EmailDraftPayload, RelationshipAction, RelationshipGoal,
    RelationshipMemory, RelationshipWorkflow, WorkflowSpec,
} from "@/types/crm";
import { createBrowserState, type BrowserState } from "./fixtures";
import { emitBrowserEvent } from "./event";

const STORAGE_KEY = "jobdex.browser-dev.v1";
const NATIVE_ONLY = "This operation requires the native app. Browser development uses synthetic local data; AI, sending, secrets and OS access are disabled.";

type Args = Record<string, unknown>;

function text(args: Args, name: string, fallback?: string): string {
    const value = args[name] ?? fallback;
    if (typeof value !== "string") throw new Error(`${name} is required`);
    return value;
}

function title(args: Args, name = "title"): string {
    const value = text(args, name).trim();
    if (!value || value.length > 200) throw new Error(`${name} must contain 1–200 characters`);
    return value;
}

function timestamp(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("Invalid date/time");
    return new Date(value).toISOString();
}

function contact(state: BrowserState, id: unknown): Contact {
    const found = state.contacts.find((item) => item.id === id);
    if (!found) throw new Error("Unknown fixture contact");
    return found;
}

function activity(state: BrowserState, contactId: string, eventType: string, now: string, actionId?: string): void {
    state.activity.unshift({ id: crypto.randomUUID(), contactId, actionId, eventType,
        detail: { origin: "browser_fixture" }, createdAt: now });
}

function validateSpec(state: BrowserState, spec: WorkflowSpec, status: string): void {
    if (spec.schemaVersion !== 1 || !Array.isArray(spec.contactIds) || !Array.isArray(spec.rules)) throw new Error("Invalid workflow specification");
    if (spec.contactIds.length > 25 || spec.rules.length > 5) throw new Error("Select at most 25 people and five rules");
    if (new Set(spec.contactIds).size !== spec.contactIds.length || new Set(spec.rules.map((r) => r.id)).size !== spec.rules.length) throw new Error("Duplicate scope or rule IDs");
    spec.contactIds.forEach((id) => contact(state, id));
    for (const rule of spec.rules) {
        if (!rule.id || !["cadence", "commitment_due", "unanswered"].includes(rule.trigger) || !["reminder", "email_draft"].includes(rule.action)) throw new Error("Unsupported workflow rule");
        if (rule.trigger === "commitment_due" ? rule.days !== undefined : !Number.isInteger(rule.days) || rule.days! < 1 || rule.days! > 365) throw new Error("Invalid rule timing");
    }
    if (status === "active") {
        if (!spec.rules.length) throw new Error("Add at least one timing rule before activating a workflow");
        if (!spec.contactIds.length) throw new Error("A workflow with no people cannot activate");
        if (spec.rules.some((r) => r.action === "email_draft") && !state.emailAccounts.some((a) => a.id === spec.accountId)) throw new Error("Choose a sending account before activation");
    }
}

/** Synchronous fixture transitions. No HTTP, Tauri, keychain or filesystem calls. */
export function dispatchBrowserCommand(state: BrowserState, command: string, args: Args = {}, clock = new Date()): unknown {
    const now = clock.toISOString();
    switch (command) {
        case "has_lock_pin": return false;
        case "check_for_update": return "";
        case "is_background_service_enabled": return false;
        case "get_api_status": return { enabled: false, port: 13420, keySet: false };
        case "detect_ai_tools": return [];
        case "check_email_credentials": return { gmail: false, outlook: false };
        case "get_settings": return state.settings;
        case "get_contacts": return state.contacts;
        case "get_contact_by_id": return contact(state, args.id);
        case "get_statuses": return state.statuses;
        case "get_tags": return state.tags;
        case "get_email_accounts": return state.emailAccounts;
        case "get_scheduled_emails":
        case "get_email_templates":
        case "get_signatures":
        case "get_contact_files":
        case "get_attachments_for_message":
        case "get_contact_activity": return [];
        case "get_contact_events": return state.contactEvents.filter((e) => e.contact_id === args.contactId);
        case "get_emails_for_contact": return state.messages.filter((m) => m.contactId === args.contactId);
        case "get_all_emails": return state.messages
            .filter((m) => !args.statusFilter || m.status === args.statusFilter)
            .slice(Number(args.offset ?? 0), Number(args.offset ?? 0) + Number(args.limit ?? 100));
        case "list_relationship_actions": {
            for (const item of state.actions) {
                if (item.status === "snoozed" && item.snoozedUntil && Date.parse(item.snoozedUntil) <= clock.getTime()) {
                    item.status = "needs_review";
                    delete item.snoozedUntil;
                }
            }
            return state.actions.filter((a) => a.status !== "dismissed");
        }
        case "list_relationship_goals": return state.goals;
        case "list_relationship_workflows": return state.workflows;
        case "get_relationship_model_status": return state.modelStatus;
        case "get_api_relationship_scope": return state.apiScope;
        case "list_relationship_memory": return state.memory.filter((m) => m.contactId === args.contactId && m.status !== "superseded");
        case "get_relationship_activity": return state.activity
            .filter((a) => !args.contactId || a.contactId === args.contactId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
        case "save_setting": {
            const key = text(args, "key");
            if (!(["theme_mode", "onboarding_complete", "last_seen_version"].includes(key) || key.startsWith("shortcut_"))) throw new Error(NATIVE_ONLY);
            state.settings[key] = text(args, "value");
            return null;
        }
        case "add_contact":
        case "update_contact": {
            const values = args.args as Args;
            if (!values || typeof values !== "object") throw new Error("Contact fields are required");
            const existing = command === "update_contact" ? contact(state, values.id) : undefined;
            const item: Contact = existing ?? { id: crypto.randomUUID(), first_name: title(values, "firstName"),
                last_name: title(values, "lastName"), created_at: now, updated_at: now, tags: [] };
            const fields = { firstName: "first_name", lastName: "last_name", title: "title", company: "company", location: "location", email: "email", linkedinUrl: "linkedin_url", companyWebsite: "company_website", statusId: "status_id", summary: "summary", nextContactDate: "next_contact_date" } as const;
            for (const [input, field] of Object.entries(fields)) {
                if (Object.prototype.hasOwnProperty.call(values, input)) Object.assign(item, { [field]: values[input] ?? undefined });
            }
            if (!item.first_name.trim() || !item.last_name.trim()) throw new Error("A first and last name are required");
            const status = state.statuses.find((s) => s.id === item.status_id) ?? state.statuses[0];
            Object.assign(item, { status_id: status?.id, status_label: status?.label, status_color: status?.color, updated_at: now });
            if (!existing) state.contacts.push(item);
            return item.id;
        }
        case "clear_contact_next_date": {
            delete contact(state, args.id).next_contact_date;
            return null;
        }
        case "create_relationship_reminder": {
            const person = contact(state, args.contactId);
            const dueAt = timestamp(args.dueAt);
            if (!dueAt) throw new Error("A due date is required");
            const action: RelationshipAction = { id: crypto.randomUUID(), contactId: person.id, kind: "reminder", status: "needs_review",
                payload: { title: title(args), description: text(args, "description", "").trim() }, evidence: { sourceMessageIds: [], sourceQuotes: [], memoryIds: [], rationale: "User-created browser fixture reminder" },
                contextHash: "browser-fixture", revision: 1, dueAt, createdAt: now, updatedAt: now };
            state.actions.push(action);
            activity(state, person.id, "reminder_created", now, action.id);
            return action;
        }
        case "edit_relationship_draft":
        case "review_relationship_action": {
            const item = state.actions.find((a) => a.id === args.id);
            if (!item) throw new Error("Unknown fixture action");
            if (item.revision !== args.expectedRevision) throw new Error("RELATIONSHIP_REVISION_CONFLICT");
            if (!["needs_review", "snoozed", "blocked", "approved"].includes(item.status) || item.sendStartedAt) throw new Error("This action is no longer reviewable");
            if (command === "edit_relationship_draft") {
                const payload = args.payload as EmailDraftPayload;
                if (item.kind !== "email_draft" || !payload || !payload.subject.trim() || !payload.body.trim()) throw new Error("A subject and body are required");
                if (contact(state, item.contactId).email !== payload.to || !state.emailAccounts.some((a) => a.id === payload.accountId)) throw new Error("Recipient or account does not match the fixture");
                if (/[\r\n]/.test(payload.subject) || new TextEncoder().encode(payload.subject).length > 998 || new TextEncoder().encode(payload.body).length > 32768) throw new Error("Invalid draft size or subject");
                item.payload = structuredClone(payload);
                item.revision++;
                item.status = "needs_review";
                delete item.approvedAt;
                delete item.approvedRevision;
                activity(state, item.contactId, "draft_edited", now, item.id);
            } else {
                const decision = text(args, "decision");
                if (decision === "approve") throw new Error(NATIVE_ONLY);
                if (decision === "done") {
                    if (item.kind !== "reminder") throw new Error("Only reminders can be marked done");
                    item.status = "done";
                } else if (decision === "dismiss") item.status = "dismissed";
                else if (decision === "snooze") {
                    const until = timestamp(args.snoozedUntil);
                    if (!until || Date.parse(until) <= clock.getTime()) throw new Error("Snooze time must be in the future");
                    item.status = "snoozed";
                    item.snoozedUntil = until;
                } else throw new Error("Unsupported review decision");
                delete item.approvedAt;
                delete item.approvedRevision;
                activity(state, item.contactId, decision === "done" ? "reminder_done" : decision === "snooze" ? "action_snoozed" : "action_dismissed", now, item.id);
            }
            item.updatedAt = now;
            return item;
        }
        case "save_relationship_workflow": {
            const status = text(args, "status");
            if (!["draft", "active", "paused", "archived"].includes(status)) throw new Error("Invalid workflow status");
            const spec = structuredClone(args.spec) as WorkflowSpec;
            validateSpec(state, spec, status);
            const existing = args.id ? state.workflows.find((w) => w.id === args.id) : undefined;
            if (args.id && !existing) throw new Error("Unknown fixture workflow");
            if (existing && existing.revision !== args.expectedRevision) throw new Error("RELATIONSHIP_REVISION_CONFLICT");
            const item: RelationshipWorkflow = { id: existing?.id ?? crypto.randomUUID(), title: title(args), intent: text(args, "intent", "").trim(),
                goalId: typeof args.goalId === "string" ? args.goalId : undefined, spec, status: status as RelationshipWorkflow["status"],
                revision: (existing?.revision ?? 0) + 1, activatedAt: existing?.activatedAt ?? (status === "active" ? now : undefined), createdAt: existing?.createdAt ?? now, updatedAt: now };
            if (existing) {
                state.workflows.splice(state.workflows.indexOf(existing), 1, item);
                for (const action of state.actions.filter((a) => a.workflowId === item.id && ["preparing", "needs_review", "snoozed", "approved", "blocked"].includes(a.status))) {
                    action.status = "dismissed";
                    delete action.approvedAt;
                    delete action.approvedRevision;
                }
            } else state.workflows.push(item);
            return item;
        }
        case "save_relationship_goal": {
            const existing = args.id ? state.goals.find((g) => g.id === args.id) : undefined;
            const status = text(args, "status");
            if (!["active", "paused", "archived"].includes(status)) throw new Error("Invalid goal status");
            if (args.id && !existing) throw new Error("Unknown fixture goal");
            const item: RelationshipGoal = { id: existing?.id ?? crypto.randomUUID(), title: title(args), intent: text(args, "intent", ""), status: status as RelationshipGoal["status"], createdAt: existing?.createdAt ?? now, updatedAt: now };
            if (existing) state.goals.splice(state.goals.indexOf(existing), 1, item); else state.goals.push(item);
            if (status !== "active") state.workflows.filter((w) => w.goalId === item.id && w.status === "active").forEach((w) => { w.status = "paused"; });
            return item;
        }
        case "create_relationship_memory": {
            const person = contact(state, args.contactId);
            const kind = text(args, "kind");
            if (!["context", "commitment", "boundary"].includes(kind)) throw new Error("Invalid memory kind");
            const value = text(args, "text").trim();
            if (!value || value.length > 4000) throw new Error("Memory text must contain 1–4000 characters");
            const item: RelationshipMemory = { id: crypto.randomUUID(), contactId: person.id, kind: kind as RelationshipMemory["kind"], text: value,
                origin: "user", status: "confirmed", dueAt: timestamp(args.dueAt), createdAt: now, updatedAt: now };
            state.memory.push(item);
            activity(state, person.id, "memory_created", now);
            return item;
        }
        case "update_relationship_memory": {
            const item = state.memory.find((m) => m.id === args.id);
            if (!item) throw new Error("Unknown fixture memory");
            const value = text(args, "text").trim();
            const dueAt = timestamp(args.dueAt);
            const status = text(args, "status");
            if (!value || value.length > 4000 || !["suggested", "confirmed", "dismissed", "superseded"].includes(status)) throw new Error("Invalid memory edit");
            if (item.text !== value || item.dueAt !== dueAt) {
                item.status = "superseded";
                const replacement: RelationshipMemory = { id: crypto.randomUUID(), contactId: item.contactId, kind: item.kind, text: value, dueAt,
                    origin: "user", status: status as RelationshipMemory["status"], createdAt: now, updatedAt: now };
                state.memory.push(replacement);
                activity(state, item.contactId, "memory_corrected", now);
                return replacement;
            }
            item.status = status as RelationshipMemory["status"];
            item.updatedAt = now;
            activity(state, item.contactId, "memory_status_changed", now);
            return item;
        }
        case "set_relationship_agent_paused": {
            if (typeof args.paused !== "boolean") throw new Error("Paused must be a boolean");
            state.modelStatus.paused = args.paused;
            return null;
        }
        case "set_api_relationship_scope": {
            if (!["read", "organize"].includes(String(args.access)) || !Array.isArray(args.allowedContactIds) || typeof args.allowContactCreation !== "boolean") throw new Error("Invalid API scope");
            args.allowedContactIds.forEach((id) => contact(state, id));
            state.apiScope = { access: args.access as "read" | "organize", allowedContactIds: args.allowedContactIds as string[], allowContactCreation: args.allowContactCreation };
            return state.apiScope;
        }
        default: throw new Error(`${NATIVE_ONLY} (${command})`);
    }
}

function loadBrowserState(): BrowserState {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const value: BrowserState = JSON.parse(stored);
            if (value.schemaVersion === 1 && Array.isArray(value.contacts) && Array.isArray(value.actions)) return value;
        } catch { /* Disposable fixtures can always be restored with Reset fixtures. */ }
    }
    return createBrowserState();
}

export function resetBrowserState(showOnboarding = false): void {
    const state = createBrowserState();
    if (showOnboarding) state.settings.onboarding_complete = "false";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function invokeBrowser<T>(command: string, args: Args = {}): Promise<T> {
    const state = loadBrowserState();
    const result = dispatchBrowserCommand(state, command, args);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!command.startsWith("get_") && !command.startsWith("list_") && !["has_lock_pin", "check_for_update", "check_email_credentials", "detect_ai_tools", "is_background_service_enabled"].includes(command)) {
        // Match the native event boundary so page-local consumers refetch.
        queueMicrotask(() => emitBrowserEvent("relationship_agent_changed", { at: new Date().toISOString() }));
    }
    return structuredClone(result) as T;
}
