import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useErrors } from "@/hooks/use-errors";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Contact } from "@/types/crm";
import { format } from "date-fns";


interface ComposeEmailDialogProps {
    contact: Contact | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface EmailAccount {
    id: string;
    email: string;
    provider: string;
}

const TEMPLATES = [
    {
        name: "VC Intro",
        subject: "Quick intro - [Your Background]",
        body: `Hi {{first_name}},\n\nI came across your profile and was impressed by [specific observation].\n\nI'm reaching out because [brief value prop]. I'd love to learn more about [their work/company].\n\nWould you be open to a brief call next week?\n\nBest,\n[Your Name]`,
    },
    {
        name: "Job Application",
        subject: "Application - [Position] at [Company]",
        body: `Hi {{first_name}},\n\nI'm excited to apply for the [Position] role at [Company].\n\nMy background in [relevant experience] aligns well with what you're looking for. [Specific achievement].\n\nI've attached my resume for your review. I'd welcome the opportunity to discuss how I can contribute to your team.\n\nBest regards,\n[Your Name]`,
    },
    {
        name: "Follow Up",
        subject: "Following up on our conversation",
        body: `Hi {{first_name}},\n\nI wanted to follow up on [previous context].\n\n[Additional value/question].\n\nLooking forward to hearing from you.\n\nBest,\n[Your Name]`,
    },
];

export function ComposeEmailDialog({
    contact,
    open,
    onOpenChange,
}: ComposeEmailDialogProps) {
    const { handleError } = useErrors();
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);

    // Account Selection
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>("");

    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    const [isScheduling, setIsScheduling] = useState(false);


    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const accts = await invoke<EmailAccount[]>("get_email_accounts");
                setAccounts(accts);
                if (accts.length > 0 && !selectedAccount) {
                    setSelectedAccount(accts[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch accounts:", err);
            }
        };
        if (open) {
            fetchAccounts();
        }
    }, [open]);

    // Pre-fill email when contact changes
    useEffect(() => {
        if (contact?.email) {
            setTo(contact.email);
        }
    }, [contact]);



    const handleSend = async () => {
        if (!selectedAccount) {
            handleError("Please connect an email account first in Settings.");
            return;
        }
        if (!to || !subject || !body) {
            handleError("Please fill in all fields");
            return;
        }

        setSending(true);
        try {
            if (scheduledDate) {
                if (!contact?.id) {
                    handleError("Scheduling requires a contact context currently.");
                    setSending(false);
                    return;
                }

                await invoke("email_schedule", {
                    accountId: selectedAccount,
                    contactId: contact.id,
                    subject,
                    body,
                    scheduledAt: Math.floor(scheduledDate.getTime() / 1000)
                });
                toast.success(`Email scheduled for ${format(scheduledDate, "PP p")}`);
            } else {
                await invoke("email_send", {
                    accountId: selectedAccount,
                    to,
                    subject,
                    body
                });
                toast.success("Email sent successfully!");
            }
            onOpenChange(false);
            setSubject("");
            setBody("");
            setScheduledDate(undefined);
            setIsScheduling(false);
        } catch (err) {
            handleError(err, "Failed to send email");
        } finally {
            setSending(false);
        }
    };

    const applyTemplate = (template: typeof TEMPLATES[0]) => {
        const firstName = contact?.first_name || "there";
        setSubject(template.subject);
        setBody(template.body.replace(/\{\{first_name\}\}/g, firstName));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Compose Email
                    </DialogTitle>
                </DialogHeader>

                {accounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <p className="text-muted-foreground text-center">
                            No email accounts connected.
                        </p>
                        <Button onClick={() => onOpenChange(false)} variant="outline">
                            Close and Go to Settings
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <Label className="text-right">From</Label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.email} ({acc.provider})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 gap-4 items-center">
                            <Label htmlFor="to" className="text-right">To</Label>
                            <Input
                                id="to"
                                type="email"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 items-start">
                            <Label htmlFor="subject" className="text-right pt-2">Subject</Label>
                            <div className="col-span-3">
                                <Input
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Subject line..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Message Body</Label>
                                <div className="flex gap-2">
                                    {TEMPLATES.map(t => (
                                        <Button key={t.name} variant="ghost" size="xs" onClick={() => applyTemplate(t)}>
                                            {t.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={12}
                                className="font-sans"
                            />
                        </div>

                    </div>
                )}

                <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
                    <Popover open={isScheduling} onOpenChange={setIsScheduling}>
                        <PopoverTrigger asChild>
                            <Button variant={scheduledDate ? "secondary" : "ghost"} size="sm">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {scheduledDate ? format(scheduledDate, "MMM d, h:mm a") : "Schedule Send"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4" align="start">
                            <div className="space-y-4">
                                <Label>Schedule Time</Label>
                                <Input
                                    type="datetime-local"
                                    className="w-full block"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setScheduledDate(new Date(e.target.value));
                                        } else {
                                            setScheduledDate(undefined);
                                        }
                                    }}
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                                <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={() => setIsScheduling(false)}>Done</Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSend} disabled={sending}>
                            {sending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {scheduledDate ? "Scheduling..." : "Sending..."}
                                </>
                            ) : (
                                <>
                                    {scheduledDate ? <CalendarIcon className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                    {scheduledDate ? "Schedule" : "Send"}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
