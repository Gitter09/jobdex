import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import { useErrors } from "@/hooks/use-errors";
import { EmailTemplate } from "@/types/crm";
import { toast } from "sonner";

interface EditTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: EmailTemplate; // If provided, we're editing
    onSuccess: () => void;
}

export function EditTemplateDialog({
    open,
    onOpenChange,
    template,
    onSuccess,
}: EditTemplateDialogProps) {
    const { handleError } = useErrors();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    useEffect(() => {
        if (open) {
            if (template) {
                setName(template.name);
                setSubject(template.subject || "");
                setBody(template.body || "");
            } else {
                setName("");
                setSubject("");
                setBody("");
            }
        }
    }, [open, template]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Template name is required");
            return;
        }

        setIsLoading(true);
        try {
            await invoke("upsert_email_template", {
                id: template?.id,
                name,
                subject: subject || null,
                body: body || null,
            });
            toast.success(template ? "Template updated" : "Template created");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            handleError(error, "Failed to save template");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Initial Outreach, Follow Up #1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="subject">Default Subject</Label>
                        <Input
                            id="subject"
                            placeholder="e.g., Question about {{company}}"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="body">Email Body</Label>
                        <Textarea
                            id="body"
                            placeholder="Write your template here... use {{first_name}}, {{last_name}}, {{company}}, {{title}}, {{location}}"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={isLoading}
                            rows={10}
                        />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-1">
                            Variables: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{title}}"}, {"{{location}}"}
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : template ? "Update Template" : "Create Template"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
