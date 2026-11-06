import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useOutletContext } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, ChevronDown, Clock, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ActionReviewDialog,
    errorCodeLabel,
} from "@/components/relationships/action-review-dialog";
import { useRelationshipAgent } from "@/hooks/use-relationship-agent";
import { useErrors } from "@/hooks/use-errors";
import { cn } from "@/lib/utils";
import { isEmailDraft, isReminder } from "@/types/crm";
import type { Contact, RelationshipAction, RelationshipActivity } from "@/types/crm";

const ACTIVITY_LABELS: Record<string, string> = {
    action_created: "Action created",
    draft_prepared: "Draft prepared",
    preparation_blocked: "Preparation blocked",
    action_approved: "Approved to send",
    send_started: "Send started",
    send_succeeded: "Sent",
    send_blocked: "Send blocked",
    delivery_unknown: "Delivery unclear",
    action_dismissed: "Dismissed",
    reminder_created: "Reminder created",
    reminder_done: "Reminder done",
    action_snoozed: "Snoozed",
    memory_created: "Context saved",
    memory_corrected: "Context corrected",
    memory_status_changed: "Context status changed",
    draft_edited: "Draft edited",
    external_draft_proposed: "Draft proposed through the API",
};

/**
 * Needs-you bands, in order:
 *  (a) overdue (dueAt before now),
 *  (b) unanswered follow-ups (rationale mentions "no newer reply"),
 *  (c) cadence reminders (rationale mentions "days since"),
 *  (d) everything else.
 */
function needsYouBand(action: RelationshipAction, now: number): number {
    const due = action.dueAt ? new Date(action.dueAt).getTime() : null;
    if (due !== null && due < now) return 0;
    const rationale = action.evidence?.rationale ?? "";
    if (rationale.includes("no newer reply")) return 1;
    if (rationale.includes("days since")) return 2;
    return 3;
}

function compareNeedsYou(a: RelationshipAction, b: RelationshipAction, now: number): number {
    const band = needsYouBand(a, now) - needsYouBand(b, now);
    if (band !== 0) return band;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.id.localeCompare(b.id);
}

export function DashboardPage() {
    const { setCommandOpen } = useOutletContext<{ setCommandOpen: (open: boolean) => void }>();
    const { handleError } = useErrors();
    const { actions, loading } = useRelationshipAgent();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activities, setActivities] = useState<RelationshipActivity[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [openAction, setOpenAction] = useState<RelationshipAction | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [nextContacts, nextActivity] = await Promise.all([
                    invoke<Contact[]>("get_contacts"),
                    invoke<RelationshipActivity[]>("get_relationship_activity", { contactId: null }),
                ]);
                if (!cancelled) {
                    setContacts(nextContacts);
                    setActivities(nextActivity);
                }
            } catch (err) {
                if (!cancelled) handleError(err, "Failed to load today's relationship data");
            }
        })();
        return () => { cancelled = true; };
    }, [actions, handleError]);

    const contactNames = useMemo(() => {
        const map = new Map<string, string>();
        for (const contact of contacts) {
            const name = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim();
            map.set(contact.id, name || contact.email || "Unnamed contact");
        }
        return map;
    }, [contacts]);

    const now = Date.now();

    const needsYou = useMemo(
        () =>
            actions
                .filter(
                    (a) =>
                        (a.status === "needs_review" || a.status === "blocked") &&
                        !(a.kind === "reminder" && a.dueAt && new Date(a.dueAt).getTime() > now),
                )
                .sort((a, b) => compareNeedsYou(a, b, now)),
        [actions, now],
    );

    const waiting = useMemo(
        () =>
            actions
                .filter(
                    (a) =>
                        a.status === "snoozed" ||
                        (a.kind === "reminder" &&
                            !!a.dueAt &&
                            new Date(a.dueAt).getTime() > now &&
                            a.status !== "done" &&
                            a.status !== "dismissed"),
                )
                .sort((a, b) => {
                    const aAt = new Date(a.snoozedUntil ?? a.dueAt ?? a.createdAt).getTime();
                    const bAt = new Date(b.snoozedUntil ?? b.dueAt ?? b.createdAt).getTime();
                    return aAt - bAt;
                }),
        [actions, now],
    );

    const recent = activities.slice(0, 8);
    const visibleNeedsYou = showAll ? needsYou : needsYou.slice(0, 5);
    const hiddenCount = needsYou.length - visibleNeedsYou.length;

    const openContactName = openAction ? contactNames.get(openAction.contactId) : undefined;

    return (
        <div className="flex flex-col h-full relative">
            <PageHeader title="Today" onSearchClick={() => setCommandOpen(true)} />

            <div className="flex-1 overflow-auto p-6 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Today</h2>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                        What needs a human, what is waiting, and what changed recently.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Needs you</p>
                            <p className="text-3xl font-semibold tracking-tight mt-1">{needsYou.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Waiting</p>
                            <p className="text-3xl font-semibold tracking-tight mt-1">{waiting.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Recent activity</p>
                            <p className="text-3xl font-semibold tracking-tight mt-1">{activities.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <section className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight">Needs you</h3>
                    {loading && needsYou.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : needsYou.length === 0 ? (
                        <p className="text-sm text-muted-foreground break-words">
                            Nothing needs you right now. Add a reminder on Tasks, or open someone and create a
                            workflow to stay in touch.
                        </p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {visibleNeedsYou.map((action) => (
                                    <ActionCard
                                        key={action.id}
                                        action={action}
                                        contactName={contactNames.get(action.contactId)}
                                        onOpen={() => setOpenAction(action)}
                                    />
                                ))}
                            </div>
                            {hiddenCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    Show more ({hiddenCount})
                                </Button>
                            )}
                        </>
                    )}
                </section>

                <section className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight">Waiting</h3>
                    {waiting.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Snoozed items and future reminders show here.</p>
                    ) : (
                        <div className="space-y-2">
                            {waiting.map((action) => (
                                <ActionCard
                                    key={action.id}
                                    action={action}
                                    contactName={contactNames.get(action.contactId)}
                                    onOpen={() => setOpenAction(action)}
                                    muted
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-3">
                    <h3 className="text-sm font-semibold tracking-tight">Recent activity</h3>
                    {recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Activity appears here after the agent prepares, sends, or you record a reminder.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {recent.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm border-l-2 border-border pl-3"
                                >
                                    <span className="text-muted-foreground tabular-nums">
                                        {format(new Date(entry.createdAt), "MMM d, h:mm a")}
                                    </span>
                                    <span className="font-medium break-words">
                                        {contactNames.get(entry.contactId) ?? "Unknown contact"}
                                    </span>
                                    <span className="text-muted-foreground break-words">
                                        {ACTIVITY_LABELS[entry.eventType] ?? entry.eventType.replace(/_/g, " ")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <ActionReviewDialog
                action={openAction ? actions.find((item) => item.id === openAction.id) ?? openAction : null}
                contactName={openContactName}
                onOpenChange={(open) => {
                    if (!open) setOpenAction(null);
                }}
            />
        </div>
    );
}

interface ActionCardProps {
    action: RelationshipAction;
    contactName?: string;
    onOpen: () => void;
    muted?: boolean;
}

function ActionCard({ action, contactName, onOpen, muted }: ActionCardProps) {
    const blocked = action.status === "blocked";
    const due = action.dueAt ? format(new Date(action.dueAt), "MMM d, h:mm a") : null;
    const title = isReminder(action)
        ? action.payload.title
        : isEmailDraft(action)
            ? action.payload.subject || "(no subject)"
            : action.kind === "reminder" ? "Reminder" : "Email draft";
    const Icon = action.kind === "reminder" ? Clock : Mail;

    return (
        <button
            type="button"
            onClick={(event) => {
                event.currentTarget.focus();
                onOpen();
            }}
            className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
            <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium break-words">{contactName ?? "Unknown contact"}</span>
                        <Badge variant="secondary">{action.kind === "reminder" ? "Reminder" : "Email draft"}</Badge>
                        {blocked && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                Blocked
                            </Badge>
                        )}
                        {muted && action.status === "snoozed" && <Badge variant="outline">Snoozed</Badge>}
                    </div>
                    <p className={cn("text-sm break-words", muted && "text-muted-foreground")}>{title}</p>
                    {blocked && errorCodeLabel(action.errorCode) && (
                        <p className="text-xs text-destructive break-words">{errorCodeLabel(action.errorCode)}</p>
                    )}
                    {due ? (
                        <p className="text-xs text-muted-foreground">Due {due}</p>
                    ) : action.status === "snoozed" && action.snoozedUntil ? (
                        <p className="text-xs text-muted-foreground">
                            Returns {formatDistanceToNow(new Date(action.snoozedUntil), { addSuffix: true })}
                        </p>
                    ) : null}
                </div>
            </div>
        </button>
    );
}
