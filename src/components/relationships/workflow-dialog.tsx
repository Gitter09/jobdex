import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { AlertTriangle, HelpCircle, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useErrors } from "@/hooks/use-errors";
import { useRelationshipAgent } from "@/hooks/use-relationship-agent";
import type {
    Contact,
    EmailAccount,
    RelationshipGoal,
    RelationshipRule,
    RelationshipWorkflow,
    RuleAction,
    RuleTrigger,
    WorkflowProposal,
    WorkflowSpec,
} from "@/types/crm";
import { cn } from "@/lib/utils";

const MAX_RULES = 5;
const NO_ACCOUNT = "none";

const TRIGGER_LABELS: Record<RuleTrigger, string> = {
    cadence: "On a regular cadence",
    commitment_due: "When a confirmed commitment is due",
    unanswered: "When there is no newer reply",
};

const ACTION_LABELS: Record<RuleAction, string> = {
    reminder: "Remind me",
    email_draft: "Draft an email for my review",
};

/** Plain-language description of one rule, used in the dialog and on workflow cards. */
export function describeRule(rule: RelationshipRule): string {
    const days = rule.days ?? 0;
    const when =
        rule.trigger === "cadence"
            ? `Every ${days} day${days === 1 ? "" : "s"}`
            : rule.trigger === "unanswered"
              ? `When there has been no newer reply from this person for ${days} day${days === 1 ? "" : "s"}`
              : "When a confirmed commitment is due";
    return `${when} — ${rule.action === "email_draft" ? "draft an email for my review" : "remind me"}`;
}

function errorText(error: unknown): string {
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }
    return "Something went wrong.";
}

function newRule(): RelationshipRule {
    return { id: crypto.randomUUID(), trigger: "cadence", days: 45, action: "reminder" };
}

interface WorkflowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflow?: RelationshipWorkflow | null;
    goalId?: string | null;
}

export function WorkflowDialog({ open, onOpenChange, workflow = null, goalId = null }: WorkflowDialogProps) {
    const { handleError } = useErrors();
    const { saveWorkflow } = useRelationshipAgent({ autoLoad: false });

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [goals, setGoals] = useState<RelationshipGoal[]>([]);

    const [title, setTitle] = useState("");
    const [intent, setIntent] = useState("");
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goalId);
    const [contactIds, setContactIds] = useState<string[]>([]);
    const [purpose, setPurpose] = useState("");
    const [tone, setTone] = useState("");
    const [accountId, setAccountId] = useState<string>(NO_ACCOUNT);
    const [rules, setRules] = useState<RelationshipRule[]>([]);

    const [questions, setQuestions] = useState<string[]>([]);
    const [unsupported, setUnsupported] = useState<string[]>([]);
    const [suggesting, setSuggesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expectedRevision, setExpectedRevision] = useState<number | null>(null);
    const [conflict, setConflict] = useState<RelationshipWorkflow | null>(null);
    const proposalGeneration = useRef(0);

    const loadWorkflow = useCallback((record: RelationshipWorkflow | null) => {
        setTitle(record?.title ?? "");
        setIntent(record?.intent ?? "");
        setSelectedGoalId(record ? record.goalId ?? null : goalId);
        setContactIds(record?.spec.contactIds ?? []);
        setPurpose(record?.spec.purpose ?? "");
        setTone(record?.spec.tone ?? "");
        setAccountId(record?.spec.accountId ?? NO_ACCOUNT);
        setRules(record ? record.spec.rules : [newRule()]);
        setExpectedRevision(record?.revision ?? null);
        setQuestions([]);
        setUnsupported([]);
        setConflict(null);
        setError(null);
    }, [goalId]);

    useEffect(() => {
        // A response from a closed/replaced dialog must never overwrite a new form.
        proposalGeneration.current += 1;
        setSuggesting(false);
        loadWorkflow(open ? workflow : null);
    }, [open, workflow, loadWorkflow]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            try {
                const [nextContacts, nextAccounts, nextGoals] = await Promise.all([
                    invoke<Contact[]>("get_contacts"),
                    invoke<EmailAccount[]>("get_email_accounts"),
                    invoke<RelationshipGoal[]>("list_relationship_goals"),
                ]);
                if (!cancelled) {
                    setContacts(nextContacts);
                    setAccounts(nextAccounts);
                    setGoals(nextGoals);
                }
            } catch (err) {
                if (!cancelled) handleError(err, "Failed to load workflow options");
            }
        })();
        return () => { cancelled = true; };
    }, [open, handleError]);

    const emailRules = rules.filter((rule) => rule.action === "email_draft");
    const proposalBlocker = questions.length || unsupported.length
        ? "Resolve the AI proposal questions or explicitly continue with manual rules before saving."
        : null;
    const reviewBlocker = proposalBlocker ?? (conflict ? "Choose how to resolve the newer saved version first." : null);

    const activationBlocker = useMemo(() => {
        if (reviewBlocker) return reviewBlocker;
        if (contactIds.length === 0) return "Select at least one person before activating.";
        if (contactIds.length > 25) return "A workflow can cover at most 25 people.";
        if (rules.length === 0) return "Add at least one timing rule before activating.";
        if (emailRules.length > 0 && accountId === NO_ACCOUNT) {
            return "Choose a sending account before activating email drafts.";
        }
        return null;
    }, [contactIds.length, emailRules.length, accountId, rules.length, reviewBlocker]);

    const toggleContact = (id: string) => {
        setContactIds((current) =>
            current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
        );
    };

    const updateRule = (id: string, patch: Partial<RelationshipRule>) => {
        setRules((current) =>
            current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
        );
    };

    const suggest = async () => {
        if (!intent.trim()) {
            setError("Describe what you want in a sentence or two first.");
            return;
        }
        const generation = ++proposalGeneration.current;
        setSuggesting(true);
        setError(null);
        try {
            const proposal = await invoke<WorkflowProposal>("propose_relationship_workflow", {
                intent: intent.trim(),
                contactIds,
                goalId: selectedGoalId ?? null,
            });
            if (generation !== proposalGeneration.current) return;
            setQuestions(proposal.questions ?? []);
            setUnsupported(proposal.unsupportedRequests ?? []);
            if (proposal.title) setTitle(proposal.title);
            if (proposal.spec) {
                const spec = proposal.spec;
                setContactIds(spec.contactIds);
                setPurpose(spec.purpose ?? "");
                setTone(spec.tone ?? "");
                if (spec.accountId) setAccountId(spec.accountId);
                setRules(spec.rules.slice(0, MAX_RULES));
            }
            if (!proposal.spec) {
                toast.message("No proposal was generated", {
                    description: "Edit the fields below yourself — nothing runs until you activate.",
                });
            }
        } catch (err) {
            if (generation === proposalGeneration.current) {
                handleError(err, "Failed to propose a workflow");
                setError(errorText(err));
            }
        } finally {
            if (generation === proposalGeneration.current) setSuggesting(false);
        }
    };

    const persist = async (status: "draft" | "active") => {
        if (saving || suggesting) return;
        const blocker = status === "active" ? activationBlocker : reviewBlocker;
        if (blocker) {
            setError(blocker);
            return;
        }
        if (!title.trim()) {
            setError("Give this workflow a title.");
            return;
        }
        const spec: WorkflowSpec = {
            schemaVersion: 1,
            contactIds,
            accountId: accountId === NO_ACCOUNT ? undefined : accountId,
            purpose: purpose.trim(),
            tone: tone.trim(),
            rules: rules.map((rule) =>
                rule.trigger === "commitment_due"
                    ? { id: rule.id, trigger: rule.trigger, action: rule.action }
                    : { id: rule.id, trigger: rule.trigger, days: rule.days ?? 0, action: rule.action },
            ),
        };
        setSaving(true);
        setError(null);
        try {
            await saveWorkflow({
                id: workflow?.id ?? null,
                expectedRevision,
                title: title.trim(),
                intent: intent.trim(),
                goalId: selectedGoalId ?? null,
                spec,
                status,
            });
            toast.success(status === "active" ? "Workflow activated" : "Workflow saved");
            onOpenChange(false);
        } catch (err) {
            const message = errorText(err);
            setError(message);
            handleError(err, "Failed to save workflow");
            if (message.includes("RELATIONSHIP_REVISION_CONFLICT") && workflow?.id) {
                try {
                    const latest = (await invoke<RelationshipWorkflow[]>("list_relationship_workflows"))
                        .find((record) => record.id === workflow.id);
                    if (latest) {
                        setConflict(latest);
                        setError("This workflow changed. Your edits are still here; review the saved version before choosing what to keep.");
                    }
                } catch (refreshError) {
                    handleError(refreshError, "Failed to load the latest workflow");
                }
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{workflow ? "Edit workflow" : "New workflow"}</DialogTitle>
                    <DialogDescription className="break-words">
                        Describe what you want and review the exact scope and timing before anything runs.
                    </DialogDescription>
                </DialogHeader>

                {conflict && (
                    <div role="alert" aria-label="Newer saved workflow" className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs break-words">
                        <p className="font-medium">Latest saved version: {conflict.title}</p>
                        <p>Status: {conflict.status} · Updated {new Date(conflict.updatedAt).toLocaleString()}</p>
                        <p>Intent: {conflict.intent}</p>
                        <p>People: {conflict.spec.contactIds.map((id) => {
                            const person = contacts.find((item) => item.id === id);
                            return person ? [person.first_name, person.last_name].filter(Boolean).join(" ") : "Unavailable person";
                        }).join(", ") || "None"}</p>
                        <p>Goal: {goals.find((item) => item.id === conflict.goalId)?.title ?? "No goal"}</p>
                        <p>Sending account: {conflict.spec.accountId
                            ? accounts.find((item) => item.id === conflict.spec.accountId)?.email ?? "Unavailable account"
                            : "None"}</p>
                        <p>Purpose: {conflict.spec.purpose}</p>
                        <p>Tone: {conflict.spec.tone}</p>
                        <ul className="list-disc pl-4">
                            {conflict.spec.rules.map((rule) => <li key={rule.id}>{describeRule(rule)}</li>)}
                        </ul>
                        <p>Your unsaved fields below have not been changed. Nothing is overwritten until you choose and save.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" disabled={saving}
                                onClick={() => loadWorkflow(conflict)}>
                                Load latest and discard my edits
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={saving}
                                onClick={() => {
                                    setExpectedRevision(conflict.revision);
                                    setConflict(null);
                                    setError(null);
                                }}>
                                Use my edits instead
                            </Button>
                        </div>
                    </div>
                )}

                {(questions.length > 0 || unsupported.length > 0) && (
                    <div className="space-y-2">
                        {questions.length > 0 && (
                            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs">
                                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                                <ul className="list-disc pl-4 space-y-1 break-words">
                                    {questions.map((question, index) => (
                                        <li key={index}>{question}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {unsupported.length > 0 && (
                            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                <div className="space-y-1 break-words">
                                    <p className="font-medium">
                                        JobDex does not support these requests, so the workflow will not run them:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {unsupported.map((item, index) => (
                                            <li key={index}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Request another proposal after clarifying your intent, or discard its unresolved parts.
                            Only the scope and manual rules you review below can run.
                        </p>
                        <Button type="button" variant="outline" size="sm" disabled={saving || suggesting || !!conflict}
                            onClick={() => {
                                setQuestions([]);
                                setUnsupported([]);
                                setError(null);
                            }}>
                            Continue with manual rules only
                        </Button>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="workflow-title">Title</Label>
                        <Input
                            id="workflow-title"
                            value={title}
                            placeholder="Stay in touch with former colleagues"
                            onChange={(event) => setTitle(event.target.value)}
                            disabled={saving || suggesting}
                            maxLength={200}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="workflow-intent">What do you want to change?</Label>
                        <Textarea
                            id="workflow-intent"
                            value={intent}
                            rows={3}
                            placeholder="Help me reconnect every 45 days; draft a short personal note, never send automatically."
                            onChange={(event) => setIntent(event.target.value)}
                            disabled={saving || suggesting}
                            maxLength={4000}
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={suggest}
                                disabled={saving || suggesting || !!conflict || !intent.trim()}
                            >
                                {suggesting ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Suggest a workflow
                            </Button>
                            <span className="text-[11px] text-muted-foreground">
                                Optional — you can fill everything in below yourself.
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="workflow-goal">Goal</Label>
                        <Select
                            value={selectedGoalId ?? NO_ACCOUNT}
                            onValueChange={(value) => setSelectedGoalId(value === NO_ACCOUNT ? null : value)}
                            disabled={saving || suggesting}
                        >
                            <SelectTrigger id="workflow-goal">
                                <SelectValue placeholder="No goal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_ACCOUNT}>No goal</SelectItem>
                                {goals.map((goal) => (
                                    <SelectItem key={goal.id} value={goal.id}>
                                        {goal.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>People in this workflow</Label>
                        <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                            {contacts.length === 0 && (
                                <p className="p-2 text-xs text-muted-foreground">
                                    Add someone in People first, then come back to scope this workflow.
                                </p>
                            )}
                            {contacts.map((contact) => {
                                const label = `${contact.first_name} ${contact.last_name}`.trim();
                                return (
                                    <label
                                        key={contact.id}
                                        htmlFor={`workflow-contact-${contact.id}`}
                                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/50 cursor-pointer"
                                    >
                                        <Checkbox
                                            id={`workflow-contact-${contact.id}`}
                                            checked={contactIds.includes(contact.id)}
                                            onCheckedChange={() => toggleContact(contact.id)}
                                            disabled={saving || suggesting}
                                        />
                                        <span className="min-w-0 truncate">{label || "Unnamed"}</span>
                                        {contact.email && (
                                            <span className="ml-auto shrink-0 text-xs text-muted-foreground truncate max-w-[45%]">
                                                {contact.email}
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            This is a saved list of people, not a live segment — it only changes when you edit it.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="workflow-purpose">Purpose</Label>
                            <Textarea
                                id="workflow-purpose"
                                value={purpose}
                                rows={2}
                                placeholder="Reconnect and share useful updates"
                                onChange={(event) => setPurpose(event.target.value)}
                                disabled={saving || suggesting}
                                maxLength={4000}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="workflow-tone">Tone</Label>
                            <Textarea
                                id="workflow-tone"
                                value={tone}
                                rows={2}
                                placeholder="Warm, short, no sales language"
                                onChange={(event) => setTone(event.target.value)}
                                disabled={saving || suggesting}
                                maxLength={4000}
                            />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="workflow-account">Sending account</Label>
                        <Select value={accountId} onValueChange={setAccountId} disabled={saving || suggesting}>
                            <SelectTrigger id="workflow-account">
                                <SelectValue placeholder="No sending account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_ACCOUNT}>No sending account</SelectItem>
                                {accounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {emailRules.length > 0 && accountId === NO_ACCOUNT && (
                            <p className="text-[11px] text-amber-600">
                                Email drafts need a sending account before this workflow can activate.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Rules</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRules((current) => [...current, newRule()])}
                                disabled={saving || suggesting || rules.length >= MAX_RULES}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Add rule
                            </Button>
                        </div>
                        {rules.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Add one rule to describe when this workflow should surface something.
                            </p>
                        )}
                        {rules.map((rule, index) => (
                            <div key={rule.id} className="rounded-md border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-[10px]">
                                        Rule {index + 1}
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Remove rule ${index + 1}`}
                                        onClick={() =>
                                            setRules((current) => current.filter((item) => item.id !== rule.id))
                                        }
                                        disabled={saving || suggesting}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Select
                                        value={rule.trigger}
                                        onValueChange={(value) => {
                                            const trigger = value as RuleTrigger;
                                            updateRule(rule.id, {
                                                trigger,
                                                days: trigger === "commitment_due" ? undefined : (rule.days ?? 45),
                                            });
                                        }}
                                        disabled={saving || suggesting}
                                    >
                                        <SelectTrigger aria-label={`Rule ${index + 1} timing`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.keys(TRIGGER_LABELS) as RuleTrigger[]).map((trigger) => (
                                                <SelectItem key={trigger} value={trigger}>
                                                    {TRIGGER_LABELS[trigger]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {rule.trigger !== "commitment_due" && (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min={1}
                                                max={365}
                                                value={rule.days ?? 45}
                                                aria-label={`Rule ${index + 1} days`}
                                                onChange={(event) =>
                                                    updateRule(rule.id, {
                                                        days: Math.min(
                                                            365,
                                                            Math.max(1, Number(event.target.value) || 1),
                                                        ),
                                                    })
                                                }
                                                disabled={saving || suggesting}
                                                className="w-24"
                                            />
                                            <span className="text-xs text-muted-foreground">days</span>
                                        </div>
                                    )}
                                </div>
                                <Select
                                    value={rule.action}
                                    onValueChange={(value) =>
                                        updateRule(rule.id, { action: value as RuleAction })
                                    }
                                    disabled={saving || suggesting}
                                >
                                    <SelectTrigger aria-label={`Rule ${index + 1} action`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(ACTION_LABELS) as RuleAction[]).map((action) => (
                                            <SelectItem key={action} value={action}>
                                                {ACTION_LABELS[action]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground break-words">{describeRule(rule)}</p>
                            </div>
                        ))}
                    </div>

                    <div className={cn("rounded-md border bg-muted/40 p-3 space-y-1 text-xs")}>
                        <p className="font-medium">What will happen</p>
                        {rules.length === 0 ? (
                            <p className="text-muted-foreground">No rules yet.</p>
                        ) : (
                            <ul className="list-disc pl-4 space-y-1 break-words">
                                {rules.map((rule) => (
                                    <li key={rule.id}>{describeRule(rule)}</li>
                                ))}
                            </ul>
                        )}
                        <p className="text-muted-foreground">
                            Data scope: {contactIds.length} selected {contactIds.length === 1 ? "person" : "people"}.
                        </p>
                        <p className="text-muted-foreground">
                            Context for the selected people may be sent to your configured AI provider when a
                            draft is prepared.
                        </p>
                        <p className="font-medium">Every email needs your approval.</p>
                    </div>

                    {error && <p className="text-xs text-destructive break-words">{error}</p>}
                    {activationBlocker && (
                        <p className="text-xs text-muted-foreground">{activationBlocker}</p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => persist("draft")}
                        disabled={saving || suggesting || reviewBlocker !== null}
                    >
                        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Save as draft
                    </Button>
                    <Button
                        type="button"
                        onClick={() => persist("active")}
                        disabled={saving || suggesting || activationBlocker !== null}
                        title={activationBlocker ?? undefined}
                    >
                        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Activate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
