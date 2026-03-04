
import { useState, useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Contact, Status } from "@/types/crm";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { createPortal } from "react-dom";

interface KanbanBoardProps {
    contacts: Contact[];
    statuses: Status[];
    onContactMove: (contactId: string, newStatusId: string) => void;
    onContactClick: (contact: Contact) => void;
    onAddContact?: (statusId: string) => void;
    onEditStatus?: (status: Status) => void;
    onDeleteStatus?: (status: Status) => void;
}

export function KanbanBoard({ contacts, statuses, onContactMove, onContactClick, onAddContact, onEditStatus, onDeleteStatus }: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    // Group contacts by status_id
    // We memoize this, but strictly speaking dnd-kit might need local state for optimistic UI 
    // if we want instant visual feedback before the parent updates 'contacts'.
    // For specific "sortable" behavior across columns, local state is often required.
    // However, if onContactMove updates the parent state fast enough, it might be clear.
    // BUT dnd-kit suggests local state for smooth animations.

    // For V1, let's rely on parent state props, but we need to find the container.

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Minimum drag distance to prevent accidental clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const activeContact = useMemo(() =>
        contacts.find(c => c.id === activeId),
        [activeId, contacts]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = () => {
        // We typically handle reordering here if we had local state, 
        // but for now we focus on dropping into a container.
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeContactId = active.id as string;
        // The over.id could be a column ID (if dropped on empty space) or a card ID (if dropped on another card)

        let newStatusId = "";

        // Check if dropped on a Status Column directly
        const droppedOnStatus = statuses.find(s => s.id === over.id);
        if (droppedOnStatus) {
            newStatusId = droppedOnStatus.id;
        } else {
            // Dropped on another Card? Find that card's status
            const overContact = contacts.find(c => c.id === over.id);
            if (overContact?.status_id) {
                newStatusId = overContact.status_id;
            }
        }

        const currentContact = contacts.find(c => c.id === activeContactId);

        if (newStatusId && currentContact && currentContact.status_id !== newStatusId) {
            onContactMove(activeContactId, newStatusId);
        }

        setActiveId(null);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 px-2 items-start">
                {statuses.sort((a, b) => a.position - b.position).map((status) => (
                    <KanbanColumn
                        key={status.id}
                        status={status}
                        contacts={contacts.filter(c => c.status_id === status.id)}
                        onCardClick={onContactClick}
                        onAddContact={onAddContact}
                        onEdit={onEditStatus}
                        onDelete={onDeleteStatus}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeContact ? (
                        <div className="w-[280px]"> {/* Force width to match column card width */}
                            <KanbanCard contact={activeContact} />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
