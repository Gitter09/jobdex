import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertTriangle, CheckCircle2, Clock, Mail, RotateCcw, ShieldAlert } from "lucide-react";
import { useRelationshipAgent } from "@/hooks/use-relationship-agent";
import { useErrors } from "@/hooks/use-errors";
import { isEmailDraft, isReminder } from "@/types/crm";
import type { ActionStatus, EmailAccount, RelationshipAction } from "@/types/crm";

const ERROR_LABELS: Record<string, string> = {
    MODEL_NOT_CONFIGURED: "The AI provider is not configured. Configure it in Settings → Agent.",
    MODEL_AUTH: "The provider rejected the API key.",
    MODEL_RATE_LIMITED: "The provider rate-limited this request. It will not retry automatically.",
    MODEL_TIMEOUT: "The request timed out. It will not retry automatically.",
    MODEL_UNREACHABLE: "The provider could not be reached.",
    MODEL_SERVER_ERROR: "The provider returned a server error.",
    MODEL_HTTP_ERROR: "The provider rejected the request.",
    MODEL_REDIRECTED: "The provider endpoint redirected, which is not allowed.",
    MODEL_INVALID_JSON: "The provider response was not valid JSON.",
    MODEL_INVALID_SCHEMA: "The provider response did not match the expected format.",
    MODEL_EMPTY_RESPONSE: "The provider returned an empty response.",
    MODEL_REFUSED: "The provider refused this request.",
    MODEL_UNSUPPORTED: "This endpoint does not return the required structured response.",
    REQUEST_LIMIT: "Today's request limit is used up. Raise it or wait for the next UTC day.",
    CONSENT_REQUIRED: "AI disclosure is not enabled for this person.",
    CONSENT_REVOKED: "Disclosure consent was revoked for this person.",
    BOUNDARY: "This person asked not to be contacted. Remove the boundary to draft again.",
    NO_RECIPIENT: "This person has no email address.",
    NO_ACCOUNT: "The workflow has no sending account.",
    PREPARATION_INTERRUPTED: "Preparation was interrupted. Retry to prepare it again.",
    INVALID_DRAFT: "The generated draft was not usable.",
    PAUSED: "The agent is paused.",
    APPROVAL_EXPIRED: "This approval expired after 24 hours.",
    APPROVAL_MISSING: "This action has no recorded approval.",
    RECIPIENT_CHANGED: "The person's email changed after this draft was prepared.",
    CONTEXT_CHANGED: "The conversation changed since this draft was prepared.",
    SYNC_INCOMPLETE: "Your mailbox did not finish syncing, so this follow-up was not prepared.",
    DELIVERY_UNKNOWN: "Delivery could not be confirmed.",
};

export function errorCodeLabel(code?: string): string | undefined {
    if (!code) return undefined;
    return ERROR_LABELS[code] ?? code.replace(/_/g, " ").toLowerCase();
}

const STATUS_LABELS: Record<ActionStatus, string> = {
    preparing: "Preparing",
    needs_review: "Needs you",
    snoozed: "Snoozed",
    approved: "Approved",
    sending: "Sending",
    sent: "Sent",
    delivery_unknown: "Delivery unclear",
    blocked: "Blocked",
    dismissed: "Dismissed",
    done: "Done",
};

export function actionStatusLabel(status: string): string {
    return STATUS_LABELS[status as ActionStatus] ?? status;
}

const SNOOZE_OPTIONS = [
    { value: "1", label: "1 hour" },
    { value: "24", label: "1 day" },
    { value: "72", label: "3 days" },
    { value: "168", label: "1 week" },
];

interface ActionReviewDialogProps {
    action: RelationshipAction | null;
    contactName?: string;
    onOpenChange: (open: boolean) => void;
}

export function ActionReviewDialog({ action, contactName, onOpenChange }: ActionReviewDialogProps) {
    const { reviewAction, editDraft, retryAction, sendAction } = useRelationshipAgent({ autoLoad: false });
    const { handleError } = useErrors();
    const [sender, setSender] = useState<{ id: string; email?: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [snoozeHours, setSnoozeHours] = useState("24");
    const [saveError, setSaveError] = useState<string | null>(null);
    const returnFocus = useRef<HTMLElement | null>(null);
    const incomingSubject = action && isEmailDraft(action) ? action.payload.subject : "";
    const incomingBody = action && isEmailDraft(action) ? action.payload.body : "";
    const accountId = action && isEmailDraft(action) ? action.payload.accountId : undefined;
    const senderEmail = sender?.id === accountId ? sender?.email : undefined;

    useEffect(() => {
        setSender(null);
        if (!accountId) return;
        let cancelled = false;
        invoke<EmailAccount[]>("get_email_accounts").then((accounts) => {
            if (!cancelled) setSender({ id: accountId, email: accounts.find((account) => account.id === accountId)?.email });
        }).catch((error) => {
            if (!cancelled) {
                setSender({ id: accountId });
                handleError(error, "Failed to load the sending account");
            }
        });
        return () => { cancelled = true; };
    }, [accountId, handleError]);

    // Rehydrate whenever the record or its revision changes — never keep a stale draft.
    useEffect(() => {
        setSaveError(null);
        setSubject(incomingSubject);
        setBody(incomingBody);
        setSnoozeHours("24");
    }, [action?.id, action?.revision, action?.status, incomingSubject, incomingBody]);

    if (!action) return null;

    const draft = isEmailDraft(action) ? action.payload : null;
    const reminder = isReminder(action) ? action.payload : null;
    const draftChanged = draft ? draft.subject !== subject || draft.body !== body : false;
    const blocked = action.status === "blocked";
    const canReview = action.status === "needs_review" || action.status === "approved";
    const canChange = ["needs_review", "approved", "snoozed", "blocked"].includes(action.status)
        && !action.sendStartedAt;

    const snoozeUntil = () =>
        new Date(Date.now() + Number(snoozeHours) * 3600_000).toISOString();

    const run = async (work: () => Promise<unknown>) => {
        setBusy(true);
        setSaveError(null);
        try {
            await work();
            onOpenChange(false);
        } catch (error) {
            // Keep the user's text on any failure, including revision conflicts.
            setSaveError(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onOpenChange(false)}>
            <DialogContent
                className="max-w-xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto"
                onOpenAutoFocus={() => {
                    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                }}
                onCloseAutoFocus={(event) => {
                    if (returnFocus.current?.isConnected) {
                        event.preventDefault();
                        returnFocus.current.focus();
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        {draft ? <Mail className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
                        <span className="truncate">
                            {reminder ? reminder.title : subject || "Email draft"}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="break-words">
                        {contactName ? `${contactName} · ` : ""}
                        {actionStatusLabel(action.status)}
                        {action.dueAt ? ` · due ${new Date(action.dueAt).toLocaleString()}` : ""}
                    </DialogDescription>
                </DialogHeader>

                {blocked && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                        <span className="break-words">{errorCodeLabel(action.errorCode) ?? "This action is blocked."}</span>
                    </div>
                )}
                {action.status === "delivery_unknown" && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                            This message was handed to your provider, but the result could not be confirmed.
                            Check your Sent mail before sending again — JobDex will never resend it automatically.
                        </span>
                    </div>
                )}
                {action.status === "sent" && (
                    <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>Sent. Your provider returned an acknowledgement.</span>
                    </div>
                )}

                {reminder && (
                    <div className="space-y-2">
                        <p className="text-sm whitespace-pre-wrap break-words">{reminder.description}</p>
                    </div>
                )}

                {draft && (
                    <div className="space-y-3">
                        <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">From account</Label>
                            <p className="text-sm break-all">{senderEmail || (sender?.id === accountId ? "Account unavailable" : "Loading account…")}</p>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">To</Label>
                            <p className="text-sm break-all">{draft.to}</p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="draft-subject">Subject</Label>
                            <Input
                                id="draft-subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={busy || !canReview && !blocked}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="draft-body">Message</Label>
                            <Textarea
                                id="draft-body"
                                value={body}
                                rows={10}
                                className="font-normal"
                                onChange={(e) => setBody(e.target.value)}
                                disabled={busy || !canReview && !blocked}
                            />
                        </div>
                        {action.evidence.rationale && (
                            <p className="text-xs text-muted-foreground break-words">{action.evidence.rationale}</p>
                        )}
                    </div>
                )}

                {saveError && (
                    <p className="text-xs text-destructive break-words">{saveError}</p>
                )}

                <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
                    <Select value={snoozeHours} onValueChange={setSnoozeHours} disabled={busy || !canChange}>
                        <SelectTrigger className="h-8 w-28 text-xs" aria-label="Snooze duration">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SNOOZE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || !canChange}
                        onClick={() =>
                            run(() => reviewAction(action.id, action.revision, "snooze", snoozeUntil()))
                        }
                    >
                        Snooze
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy || !canChange}
                        onClick={() => run(() => reviewAction(action.id, action.revision, "dismiss"))}
                    >
                        Dismiss
                    </Button>

                    {blocked && canChange && action.kind === "email_draft" && (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => retryAction(action.id))}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Retry
                        </Button>
                    )}

                    {reminder && canChange && (
                        <Button size="sm" disabled={busy} onClick={() => run(() => reviewAction(action.id, action.revision, "done"))}>
                            Mark done
                        </Button>
                    )}

                    {draft && canReview && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={busy || !draftChanged}
                                onClick={() =>
                                    run(() =>
                                        editDraft(action.id, action.revision, {
                                            accountId: draft.accountId,
                                            to: draft.to,
                                            subject,
                                            body,
                                        }),
                                    )
                                }
                            >
                                Save changes
                            </Button>
                            <Button
                                size="sm"
                                disabled={busy || draftChanged || !senderEmail}
                                title={draftChanged ? "Save your changes before approving" : undefined}
                                onClick={() =>
                                    run(async () => {
                                        const approved = await reviewAction(
                                            action.id,
                                            action.revision,
                                            "approve",
                                        );
                                        await sendAction(approved.id);
                                    })
                                }
                            >
                                Approve and send
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
