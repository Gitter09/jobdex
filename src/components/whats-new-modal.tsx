import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LATEST_RELEASE } from "@/changelog";

interface WhatsNewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WhatsNewModal({ open, onOpenChange }: WhatsNewModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>What's new in v{LATEST_RELEASE.version}</DialogTitle>
                    <DialogDescription>{LATEST_RELEASE.date}</DialogDescription>
                </DialogHeader>

                <ul className="space-y-3 py-2">
                    {LATEST_RELEASE.entries.map((item) => (
                        <li key={item.label} className="flex gap-3 text-sm">
                            <span className="font-medium shrink-0 w-52">{item.label}</span>
                            <span className="text-muted-foreground leading-relaxed">{item.detail}</span>
                        </li>
                    ))}
                </ul>

                <p className="text-xs text-muted-foreground">
                    Tasks, the email inbox, and a proper onboarding flow are still in progress — coming before long.
                </p>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Got it</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
