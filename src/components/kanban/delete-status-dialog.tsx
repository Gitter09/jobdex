import { useState } from "react";
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
import { Status } from "@/types/crm";
import { Loader2 } from "lucide-react";

interface DeleteStatusDialogProps {
    status: Status | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (status: Status) => Promise<void>;
}

export function DeleteStatusDialog({ status, open, onOpenChange, onConfirm }: DeleteStatusDialogProps) {
    const [loading, setLoading] = useState(false);

    if (!status) return null;

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onConfirm(status);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Status "{status.label}"?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Are you sure you want to delete this status? This action cannot be undone.
                        </p>
                        <p className="font-medium text-foreground">
                            Contacts currently in this status will be moved to "New".
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Status
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
