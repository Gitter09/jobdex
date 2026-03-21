import { useEffect, useState } from "react";
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
import type { Status } from "@/types/crm";

interface EditStatusDialogProps {
  status?: Status | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (label: string, color: string) => Promise<void>;
}

export function EditStatusDialog({
  status,
  open,
  onOpenChange,
  onSave,
}: EditStatusDialogProps) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever dialog opens/closes or status changes
  useEffect(() => {
    if (open) {
      setLabel(status?.label ?? "");
      setColor(status?.color ?? "#6366f1");
      setError(null);
      setLoading(false);
    }
  }, [open, status]);

  const isEditMode = !!status;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Stage name can't be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(trimmed, color);
      onOpenChange(false);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit stage" : "Add stage"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input
              id="stage-name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Interviewing"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-color">Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="stage-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <span className="font-mono text-sm text-muted-foreground">
                {color}
              </span>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEditMode ? "Save changes" : "Add stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
