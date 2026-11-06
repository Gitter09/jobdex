import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useOutletContext } from "react-router-dom";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { Clock, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { ActionReviewDialog } from "@/components/relationships/action-review-dialog";
import { useRelationshipAgent } from "@/hooks/use-relationship-agent";
import { useErrors } from "@/hooks/use-errors";
import { isReminder } from "@/types/crm";
import type { Contact, RelationshipAction } from "@/types/crm";

function defaultDueValue(): string {
    return format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");
}

export function TasksPage() {
    const { setCommandOpen } = useOutletContext<{ setCommandOpen: (open: boolean) => void }>();
    const { handleError } = useErrors();
    const { actions, loading, createReminder } = useRelationshipAgent();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [openAction, setOpenAction] = useState<RelationshipAction | null>(null);
    const [contactId, setContactId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueValue, setDueValue] = useState(defaultDueValue);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setContacts(await invoke<Contact[]>("get_contacts"));
            } catch (err) {
                handleError(err, "Failed to load contacts for reminders");
            }
        })();
    }, []);

    const contactNames = useMemo(() => {
        const map = new Map<string, string>();
        for (const contact of contacts) {
            const name = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim();
            map.set(contact.id, name || contact.email || "Unnamed contact");
        }
        return map;
    }, [contacts]);

    const reminders = useMemo(
        () =>
            actions
                .filter(isReminder)
                .filter((a) => a.status !== "dismissed")
                .sort((a, b) => {
                    const aAt = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
                    const bAt = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
                    return aAt - bAt;
                }),
        [actions],
    );

    const now = Date.now();
    const open = reminders.filter((a) => a.status !== "done");
    const sections = [
        {
            label: "Overdue",
            items: open.filter((a) => !!a.dueAt && new Date(a.dueAt).getTime() < now),
        },
        {
            label: "Today",
            items: open.filter((a) => !!a.dueAt && new Date(a.dueAt).getTime() >= now && isToday(new Date(a.dueAt))),
        },
        {
            label: "Upcoming",
            items: open.filter(
                (a) => !a.dueAt || (new Date(a.dueAt).getTime() >= now && !isToday(new Date(a.dueAt))),
            ),
        },
        {
            label: "Done",
            items: reminders.filter((a) => a.status === "done"),
        },
    ].filter((section) => section.items.length > 0);

    const resetForm = () => {
        setContactId("");
        setTitle("");
        setDescription("");
        setDueValue(defaultDueValue());
    };

    const canSubmit = contactId !== "" && title.trim() !== "" && dueValue !== "" && !saving;

    const submit = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            await createReminder(contactId, title.trim(), description.trim(), new Date(dueValue).toISOString());
            toast.success("Reminder added");
            resetForm();
            setDialogOpen(false);
        } catch {
            // The hook surfaces the error toast and keeps the form text intact.
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <PageHeader title="Tasks" onSearchClick={() => setCommandOpen(true)}>
                <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    New reminder
                </Button>
            </PageHeader>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Reminders</h2>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                        Manual reminders for people you want to follow up with. No AI setup or email account is
                        required.
                    </p>
                </div>

                {loading && reminders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground break-words">
                        No reminders yet. Add one for a person and a time — it stays on this device and needs no
                        provider.
                    </p>
                ) : (
                    sections.map((section) => (
                        <section key={section.label} className="space-y-2">
                            <h3 className="text-sm font-semibold tracking-tight">{section.label}</h3>
                            <div className="space-y-2">
                                {section.items.map((action) => (
                                    <button
                                        key={action.id}
                                        type="button"
                                        onClick={() => setOpenAction(action)}
                                        className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Clock
                                                className="h-4 w-4 mt-1 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="font-medium break-words">
                                                        {action.payload?.title}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground break-words">
                                                        {contactNames.get(action.contactId) ?? "Unknown contact"}
                                                    </span>
                                                </div>
                                                {action.payload?.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                                        {action.payload.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {action.dueAt
                                                        ? format(new Date(action.dueAt), "MMM d, h:mm a")
                                                        : "No due date"}
                                                    {action.status === "done" && " · Done"}
                                                    {action.status === "snoozed" && action.snoozedUntil &&
                                                        ` · Snoozed until ${format(new Date(action.snoozedUntil), "MMM d, h:mm a")}`}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            <Dialog
                open={dialogOpen}
                onOpenChange={(next) => {
                    setDialogOpen(next);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New reminder</DialogTitle>
                        <DialogDescription>
                            Reminders are stored locally. They do not call a model.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reminder-contact">Person</Label>
                            <Select value={contactId} onValueChange={setContactId}>
                                <SelectTrigger id="reminder-contact">
                                    <SelectValue placeholder="Choose a person" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contacts.map((contact) => (
                                        <SelectItem key={contact.id} value={contact.id}>
                                            {`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                                                contact.email ||
                                                "Unnamed contact"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reminder-title">Title</Label>
                            <Input
                                id="reminder-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Follow up about the launch"
                                maxLength={200}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reminder-description">Description</Label>
                            <Textarea
                                id="reminder-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="What you want to say or do"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reminder-due">Due</Label>
                            <Input
                                id="reminder-due"
                                type="datetime-local"
                                value={dueValue}
                                onChange={(e) => setDueValue(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={!canSubmit}>
                            Add reminder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ActionReviewDialog
                action={openAction}
                contactName={openAction ? contactNames.get(openAction.contactId) : undefined}
                onOpenChange={(next) => {
                    if (!next) setOpenAction(null);
                }}
            />
        </div>
    );
}
