import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useStatuses } from "@/hooks/use-statuses";
import { useErrors } from "@/hooks/use-errors";
import { getColorHex } from "@/lib/utils";
import { EditStatusDialog } from "./edit-status-dialog";
import type { Status } from "@/types/crm";
import { toast } from "sonner";

// ---- Sortable row ----

interface SortableStatusRowProps {
  status: Status;
  onEdit: (status: Status) => void;
  onDelete: (status: Status) => void;
}

function SortableStatusRow({ status, onEdit, onDelete }: SortableStatusRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground focus:outline-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color swatch */}
      <div
        className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10"
        style={{ backgroundColor: getColorHex(status.color) }}
      />

      {/* Label */}
      <span className="flex-1 text-sm font-medium">{status.label}</span>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(status)}
          aria-label={`Edit ${status.label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(status)}
          aria-label={`Delete ${status.label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---- Main tab ----

export function PipelineSettingsTab() {
  const { statuses, refreshStatuses, addStatus, editStatus, removeStatus } = useStatuses();
  const { handleError } = useErrors();

  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<Status | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isDeletingStatus, setIsDeletingStatus] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sorted = [...statuses].sort((a, b) => a.position - b.position);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);

    const positions = reordered.map((s, i) => ({ id: s.id, position: i }));
    try {
      await invoke("reorder_statuses", { positions });
      await refreshStatuses();
    } catch (error) {
      handleError(error, "Failed to reorder stages");
    }
  }

  async function handleSaveEdit(label: string, color: string) {
    if (!editingStatus) return;
    await editStatus(editingStatus.id, label, color);
    toast.success("Stage updated.");
  }

  async function handleSaveAdd(label: string, color: string) {
    await addStatus(label, color);
    toast.success(`"${label}" stage added.`);
  }

  async function handleConfirmDelete() {
    if (!deletingStatus) return;
    setIsDeletingStatus(true);
    try {
      await removeStatus(deletingStatus.id);
      toast.success(`"${deletingStatus.label}" stage removed.`);
      setDeletingStatus(null);
    } catch (error) {
      handleError(error, "Failed to delete stage");
    } finally {
      setIsDeletingStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Stages</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((status) => (
              <SortableStatusRow
                key={status.id}
                status={status}
                onEdit={(s) => { setEditingStatus(s); setEditDialogOpen(true); }}
                onDelete={(s) => setDeletingStatus(s)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setAddDialogOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add stage
      </Button>

      {/* Edit dialog */}
      <EditStatusDialog
        status={editingStatus}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingStatus(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* Add dialog */}
      <EditStatusDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleSaveAdd}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingStatus}
        onOpenChange={(open) => { if (!open) setDeletingStatus(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Any contacts in{" "}
              <span className="font-semibold text-foreground">
                "{deletingStatus?.label}"
              </span>{" "}
              will lose their stage. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={isDeletingStatus}
            >
              {isDeletingStatus ? "Removing…" : "Remove stage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
