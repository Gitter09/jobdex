import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Status } from "@/types/crm";
import { Loader2 } from "lucide-react";

interface EditStatusDialogProps {
    status: Status | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, label: string, color: string) => Promise<void>;
}

export function EditStatusDialog({ status, open, onOpenChange, onSave }: EditStatusDialogProps) {
    const [label, setLabel] = useState("");
    const [color, setColor] = useState("#3b82f6");
    const [loading, setLoading] = useState(false);
    const colorInputRef = useRef<HTMLInputElement>(null);

    const statusColors = [
        { name: "Blue", value: "#3b82f6" },
        { name: "Green", value: "#22c55e" },
        { name: "Purple", value: "#a855f7" },
        { name: "Yellow", value: "#eab308" },
        { name: "Orange", value: "#f97316" },
        { name: "Pink", value: "#ec4899" },
        { name: "Gray", value: "#64748b" },
    ];

    useEffect(() => {
        if (open && status) {
            setLabel(status.label);
            setColor(status.color);
        }
    }, [open, status]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!status || !label.trim()) return;

        setLoading(true);
        try {
            await onSave(status.id, label, color);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>Edit Status</DialogTitle>
                        <DialogDescription>
                            Update the name and color of this status column.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="status-label">Name</Label>
                            <Input
                                id="status-label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Status Name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex flex-wrap gap-2">
                                {statusColors.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setColor(c.value)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-all",
                                            color === c.value
                                                ? "border-foreground scale-110 shadow-sm"
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                                {/* Custom Color Trigger */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 border-transparent transition-all bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500",
                                            !statusColors.find(c => c.value === color) && "border-foreground scale-110 shadow-sm"
                                        )}
                                        title="Custom Color"
                                        onClick={() => colorInputRef.current?.click()}
                                    />
                                    <input
                                        type="color"
                                        ref={colorInputRef}
                                        className="absolute inset-0 opacity-0 w-full h-full pointer-events-none"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !label.trim()}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
