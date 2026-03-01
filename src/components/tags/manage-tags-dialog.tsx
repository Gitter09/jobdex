import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag } from "@/types/crm";
import { useTags } from "@/hooks/use-tags";
import { Trash2, Pencil, Plus, X } from "lucide-react";

interface ManageTagsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ManageTagsDialog({ open, onOpenChange }: ManageTagsDialogProps) {
    const { tags, createTag, updateTag, deleteTag } = useTags();
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState("#64748b");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!newTagName.trim()) return;
        await createTag(newTagName.trim(), newTagColor);
        setNewTagName("");
        setIsCreating(false);
    };

    const handleUpdate = async (tag: Tag, newName: string, newColor: string) => {
        await updateTag(tag.id, newName, newColor);
        setEditingTag(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Tags</DialogTitle>
                    <DialogDescription>
                        Create, edit, or delete tags to organize your contacts.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* List of Tags */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {tags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                                {editingTag?.id === tag.id ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <input
                                            type="color"
                                            value={editingTag.color}
                                            onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                                            className="h-8 w-8 rounded cursor-pointer border-none bg-transparent"
                                        />
                                        <Input
                                            value={editingTag.name}
                                            onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                            className="h-8"
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(editingTag, editingTag.name, editingTag.color)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTag(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                            <span className="font-medium text-sm">{tag.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTag(tag)}>
                                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTag(tag.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Create New Tag */}
                    {isCreating ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50 mt-2">
                            <input
                                type="color"
                                value={newTagColor}
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="h-8 w-8 rounded cursor-pointer border-none bg-transparent"
                            />
                            <Input
                                placeholder="Tag Name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="h-8"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleCreate}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full border-dashed" onClick={() => setIsCreating(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Create New Tag
                        </Button>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
