import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn, getColorHex } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useStatuses } from "@/hooks/use-statuses";

interface StatusPickerProps {
    currentStatusId?: string;
    onStatusChange: (statusId: string) => void;
    className?: string;
}




export function StatusPicker({ currentStatusId, onStatusChange, className }: StatusPickerProps) {
    const { statuses } = useStatuses();
    const [open, setOpen] = useState(false);

    // Find current status object
    const currentStatus = statuses.find(s => s.id === currentStatusId);
    const currentHex = getColorHex(currentStatus?.color);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    className={cn(
                        "h-8 px-2 text-xs font-medium border border-dashed hover:border-solid w-fit justify-start",
                        className
                    )}
                    style={currentHex ? {
                        backgroundColor: `${currentHex}20`,
                        color: currentHex,
                        borderColor: `${currentHex}40`
                    } : {}}
                >
                    {currentStatus ? currentStatus.label : "Set Status"}
                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
                <div className="flex flex-col">
                    <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Select Status
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-0.5 p-1">
                        {statuses.map(status => {
                            const hex = getColorHex(status.color);
                            return (
                                <button
                                    key={status.id}
                                    onClick={() => {
                                        onStatusChange(status.id);
                                        setOpen(false);
                                    }}
                                    className="flex w-full items-center group relative rounded-sm hover:bg-muted/50 p-1 text-left px-2 py-1 text-sm gap-2 transition-colors"
                                    style={{ color: hex }}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                                    <span className="truncate flex-1">{status.label}</span>
                                    {status.id === currentStatusId && <Check className="h-3 w-3" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
