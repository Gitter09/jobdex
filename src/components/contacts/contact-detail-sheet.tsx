import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Contact } from "@/types/crm";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Mail,
    Linkedin,
    Calendar,
    Sparkles,
    ExternalLink,
    Copy,
    Pencil,
    Trash2,
    Save,
    X,
    Loader2,
    Clock,
    History,
} from "lucide-react";
import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import { StatusPicker } from "./status-picker";
import { format } from "date-fns";

interface ContactDetailSheetProps {
    contact: Contact | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onContactUpdated?: () => void;
}

export function ContactDetailSheet({
    contact,
    open,
    onOpenChange,
    onContactUpdated
}: ContactDetailSheetProps) {
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [enriching, setEnriching] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [statusId, setStatusId] = useState("");

    // Dates (strings for inputs)
    const [lastContacted, setLastContacted] = useState("");
    const [nextContact, setNextContact] = useState("");

    // Sync form with contact
    useEffect(() => {
        if (contact) {
            setFirstName(contact.first_name || "");
            setLastName(contact.last_name || "");
            setEmail(contact.email || "");
            setLinkedinUrl(contact.linkedin_url || "");
            setStatusId(contact.status_id || "");
            // Format dates for input (YYYY-MM-DD)
            setLastContacted(contact.last_contacted_date ? contact.last_contacted_date.split('T')[0] : "");
            setNextContact(contact.next_contact_date ? contact.next_contact_date.split('T')[0] : "");
        }
    }, [contact]);

    // Reset edit mode when sheet closes
    useEffect(() => {
        if (!open) {
            setIsEditing(false);
        }
    }, [open]);

    if (!contact) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleSave = async () => {
        const updateData = {
            id: contact.id,
            firstName,
            lastName,
            email: email || null,
            linkedinUrl: linkedinUrl || null,
            statusId: statusId || null,
            lastContactedDate: lastContacted ? new Date(lastContacted).toISOString() : null,
            nextContactDate: nextContact ? new Date(nextContact).toISOString() : null,
        };
        console.log("Saving contact update (camelCase):", updateData);
        try {
            await invoke("update_contact", updateData);
            console.log("Update successful");
            setIsEditing(false);
            onContactUpdated?.();
        } catch (err) {
            console.error("Update failed:", err);
            alert(`Failed to save: ${err}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await invoke("delete_contact", { id: contact.id });
            setDeleteDialogOpen(false);
            onOpenChange(false);
            onContactUpdated?.();
        } catch (err) {
            alert(`Failed to delete: ${err}`);
        } finally {
            setDeleting(false);
        }
    };

    const cancelEdit = () => {
        // Reset to original values
        setFirstName(contact.first_name || "");
        setLastName(contact.last_name || "");
        setEmail(contact.email || "");
        setLinkedinUrl(contact.linkedin_url || "");
        setStatusId(contact.status_id || "");
        setLastContacted(contact.last_contacted_date ? contact.last_contacted_date.split('T')[0] : "");
        setNextContact(contact.next_contact_date ? contact.next_contact_date.split('T')[0] : "");
        setIsEditing(false);
    };

    const handleStatusChange = async (newId: string) => {
        setStatusId(newId);
        console.log("Quick status change:", { id: contact.id, status_id: newId });
        // If not editing, save immediately (notion style)
        if (!isEditing) {
            try {
                await invoke("update_contact", {
                    id: contact.id,
                    statusId: newId
                });
                console.log("Status update successful");
                onContactUpdated?.();
            } catch (err) {
                console.error("Status update failed:", err);
            }
        }
    };

    const handleEnrich = async () => {
        if (!contact.linkedin_url && !contact.company_website) {
            alert("No LinkedIn URL or Company Website to enrich from.");
            return;
        }

        setEnriching(true);
        // Prioritize LinkedIn, fallback to company website
        const targetUrl = contact.linkedin_url || contact.company_website || "";

        try {
            await invoke("enrich_contact_cmd", {
                id: contact.id,
                url: targetUrl
            });
            onContactUpdated?.();
        } catch (err) {
            console.error("Enrichment failed:", err);
            alert(`Enrichment failed: ${err}`);
        } finally {
            setEnriching(false);
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <SheetTitle className="text-2xl">
                                    {isEditing ? "Edit Contact" : `${contact.first_name} ${contact.last_name}`}
                                </SheetTitle>
                                <SheetDescription className="mt-1">
                                    {isEditing ? "Update contact information" : "Contact Profile"}
                                </SheetDescription>
                            </div>
                            <div className="flex items-center gap-2 mr-12">
                                {!isEditing && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteDialogOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                                <StatusPicker
                                    currentStatusId={statusId || contact.status_id}
                                    onStatusChange={handleStatusChange}
                                />
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {isEditing ? (
                            /* Edit Mode */
                            <section className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                                    <Input
                                        id="linkedin"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        placeholder="https://linkedin.com/in/username"
                                    />
                                </div>
                                {/* Dates in Edit Mode */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="lastContacted">Last Contacted</Label>
                                        <Input
                                            id="lastContacted"
                                            type="date"
                                            value={lastContacted}
                                            onChange={(e) => setLastContacted(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nextContact">Next Follow-up</Label>
                                        <Input
                                            id="nextContact"
                                            type="date"
                                            value={nextContact}
                                            onChange={(e) => setNextContact(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button onClick={cancelEdit} variant="outline" className="flex-1">
                                        <X className="mr-2 h-4 w-4" />
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                                        {saving ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="mr-2 h-4 w-4" />
                                        )}
                                        {saving ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </section>
                        ) : (
                            /* View Mode */
                            <>
                                <section className="space-y-3">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        Contact Info
                                    </h4>

                                    {contact.email && (
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{contact.email}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => copyToClipboard(contact.email!)}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}

                                    {contact.linkedin_url && (
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <Linkedin className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm truncate max-w-[280px]">
                                                    {contact.linkedin_url}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => openUrl(contact.linkedin_url!)}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Added {new Date(contact.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Cadence Info */}
                                    <div className="grid grid-cols-1 gap-2 pt-2">
                                        {contact.last_contacted_date && (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                                <History className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    Last Contacted: <span className="font-medium">{format(new Date(contact.last_contacted_date), "PPP")}</span>
                                                </span>
                                            </div>
                                        )}
                                        {contact.next_contact_date && (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                                <Clock className="h-4 w-4 text-orange-600" />
                                                <span className="text-sm text-orange-800">
                                                    Next Follow-up: <span className="font-medium">{format(new Date(contact.next_contact_date), "PPP")}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Intelligence Summary */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-yellow-500" />
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                            Intelligence Summary
                                        </h4>
                                    </div>

                                    {contact.intelligence_summary ? (
                                        <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {contact.intelligence_summary}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed text-center">
                                            <p className="text-sm text-muted-foreground mb-3">
                                                No intelligence data yet.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleEnrich}
                                                disabled={enriching}
                                            >
                                                {enriching ? (
                                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Sparkles className="mr-2 h-3 w-3" />
                                                )}
                                                {enriching ? "Analyzing..." : "Enrich Contact"}
                                            </Button>
                                        </div>
                                    )}
                                </section>

                                {/* Actions */}
                                <section className="pt-4 border-t">
                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1"
                                            variant="outline"
                                            onClick={() => setEmailDialogOpen(true)}
                                        >
                                            <Mail className="mr-2 h-4 w-4" />
                                            Draft Email
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            variant="secondary"
                                            onClick={handleEnrich}
                                            disabled={enriching}
                                        >
                                            {enriching ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="mr-2 h-4 w-4" />
                                            )}
                                            {enriching ? "Thinking..." : "Re-Enrich"}
                                        </Button>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <ComposeEmailDialog
                contact={contact}
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{contact.first_name} {contact.last_name}</strong> from your contacts. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
