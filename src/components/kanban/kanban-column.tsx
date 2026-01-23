
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Contact, Status } from "@/types/crm";
import { KanbanCard } from "./kanban-card";
import { cn, getColorHex } from "@/lib/utils";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2 } from "lucide-react";

interface KanbanColumnProps {
    status: Status;
    contacts: Contact[];
    onCardClick?: (contact: Contact) => void;
    onAddContact?: (statusId: string) => void;
    onEdit?: (status: Status) => void;
    onDelete?: (status: Status) => void;
}

export function KanbanColumn({ status, contacts, onCardClick, onAddContact, onEdit, onDelete }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status.id,
    });

    return (
        <div className="flex flex-col h-full w-[280px] min-w-[280px] bg-muted/40 rounded-xl border border-border/50">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getColorHex(status.color) }}
                    />
                    <h3 className="font-semibold text-sm">{status.label}</h3>
                    <span className="text-xs text-muted-foreground ml-1 font-medium bg-muted px-1.5 rounded-md">
                        {contacts.length}
                    </span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(status)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete?.(status)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Status
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin transition-colors",
                    isOver ? "bg-muted/80" : ""
                )}
            >
                <SortableContext
                    items={contacts.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {contacts.map((contact) => (
                        <KanbanCard
                            key={contact.id}
                            contact={contact}
                            onClick={onCardClick}
                        />
                    ))}
                </SortableContext>

                {contacts.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-muted-foreground/10 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/50">Drop items here</span>
                    </div>
                )}
            </div>

            {/* Footer / Quick Add */}
            <div className="p-2 pt-0">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-xs text-muted-foreground h-8 hover:bg-muted"
                    onClick={() => onAddContact?.(status.id)}
                >
                    <Plus className="mr-2 h-3 w-3" />
                    New
                </Button>
            </div>
        </div>
    );
}
