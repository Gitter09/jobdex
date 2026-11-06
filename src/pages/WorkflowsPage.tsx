import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import {
    Archive,
    ArchiveRestore,
    Loader2,
    Pause,
    Pencil,
    Play,
    Plus,
    Target,
    Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useErrors } from "@/hooks/use-errors";
import { useRelationshipAgent } from "@/hooks/use-relationship-agent";
import { WorkflowDialog, describeRule } from "@/components/relationships/workflow-dialog";
import { cn } from "@/lib/utils";
import type {
    GoalStatus,
    RelationshipGoal,
    RelationshipWorkflow,
    WorkflowStatus,
} from "@/types/crm";

const CONFLICT_CODE = "RELATIONSHIP_REVISION_CONFLICT";

function errorText(error: unknown): string {
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }
    return "Something went wrong.";
}

function isConflict(error: unknown): boolean {
    return errorText(error).includes(CONFLICT_CODE);
}

const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
    draft: "Draft",
    active: "Active",
    paused: "Paused",
    archived: "Archived",
};

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
    active: "Active",
    paused: "Paused",
    archived: "Archived",
};

function StatusBadge({ status }: { status: WorkflowStatus | GoalStatus }) {
    const label =
        status in WORKFLOW_STATUS_LABELS
            ? WORKFLOW_STATUS_LABELS[status as WorkflowStatus]
            : GOAL_STATUS_LABELS[status as GoalStatus];
    return (
        <Badge
            variant={status === "active" ? "default" : status === "paused" ? "secondary" : "outline"}
            className={cn("shrink-0 text-[10px]", status === "archived" && "text-muted-foreground")}
        >
            {label}
        </Badge>
    );
}

interface GoalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    goal: RelationshipGoal | null;
    onSubmit: (args: { id: string | null; title: string; intent: string; status: GoalStatus }) => Promise<void>;
}

function GoalDialog({ open, onOpenChange, goal, onSubmit }: GoalDialogProps) {
    const [title, setTitle] = useState(goal?.title ?? "");
    const [intent, setIntent] = useState(goal?.intent ?? "");
    const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "active");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
                    <DialogDescription>
                        Goals are optional containers that group workflows. They grant no permissions on their own.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="goal-title">Title</Label>
                        <Input
                            id="goal-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Reconnect with former colleagues"
                            maxLength={200}
                            disabled={busy}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="goal-intent">Intent</Label>
                        <Textarea
                            id="goal-intent"
                            value={intent}
                            rows={3}
                            onChange={(event) => setIntent(event.target.value)}
                            placeholder="Why this matters to you right now"
                            maxLength={4000}
                            disabled={busy}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="goal-status">Status</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as GoalStatus)} disabled={busy}>
                            <SelectTrigger id="goal-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(GOAL_STATUS_LABELS) as GoalStatus[]).map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {GOAL_STATUS_LABELS[value]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {error && <p className="text-xs text-destructive break-words">{error}</p>}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        disabled={busy}
                        onClick={async () => {
                            if (!title.trim()) {
                                setError("Give this goal a title.");
                                return;
                            }
                            setBusy(true);
                            setError(null);
                            try {
                                await onSubmit({
                                    id: goal?.id ?? null,
                                    title: title.trim(),
                                    intent: intent.trim(),
                                    status,
                                });
                                onOpenChange(false);
                            } catch (err) {
                                setError(errorText(err));
                            } finally {
                                setBusy(false);
                            }
                        }}
                    >
                        {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Save goal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function WorkflowsPage() {
    const { setCommandOpen } = useOutletContext<{ setCommandOpen: (open: boolean) => void }>();
    const { handleError } = useErrors();
    const { workflows, goals, loading, refresh, saveWorkflow, saveGoal } = useRelationshipAgent();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<RelationshipWorkflow | null>(null);
    const [dialogGoalId, setDialogGoalId] = useState<string | null>(null);
    const [goalDialog, setGoalDialog] = useState<{ open: boolean; goal: RelationshipGoal | null }>({
        open: false,
        goal: null,
    });
    const [busyId, setBusyId] = useState<string | null>(null);
    const [conflict, setConflict] = useState<{ id: string; message: string } | null>(null);

    const openNew = () => {
        setEditing(null);
        setDialogGoalId(null);
        setDialogOpen(true);
    };

    const openEdit = (workflow: RelationshipWorkflow) => {
        setEditing(workflow);
        setDialogGoalId(workflow.goalId ?? null);
        setDialogOpen(true);
    };

    const setWorkflowStatus = async (workflow: RelationshipWorkflow, status: WorkflowStatus) => {
        setBusyId(workflow.id);
        setConflict(null);
        try {
            await saveWorkflow({
                id: workflow.id,
                expectedRevision: workflow.revision,
                title: workflow.title,
                intent: workflow.intent,
                goalId: workflow.goalId ?? null,
                spec: workflow.spec,
                status,
            });
            toast.success(
                status === "active"
                    ? "Workflow activated"
                    : status === "paused"
                      ? "Workflow paused"
                      : "Workflow archived",
            );
        } catch (error) {
            if (isConflict(error)) {
                setConflict({
                    id: workflow.id,
                    message:
                        "Someone changed this workflow elsewhere. Your view was refreshed — reopen it and apply your change again.",
                });
                await refresh();
            } else {
                handleError(error, "Failed to update this workflow");
            }
        } finally {
            setBusyId(null);
        }
    };

    const setGoalStatus = async (goal: RelationshipGoal, status: GoalStatus) => {
        setBusyId(goal.id);
        try {
            await saveGoal({ id: goal.id, title: goal.title, intent: goal.intent, status });
            toast.success(
                status === "paused"
                    ? "Goal paused"
                    : status === "archived"
                      ? "Goal archived"
                      : "Goal reactivated",
            );
        } catch (error) {
            if (isConflict(error)) {
                setConflict({ id: goal.id, message: "This goal changed elsewhere. The list was refreshed." });
                await refresh();
            } else {
                handleError(error, "Failed to update this goal");
            }
        } finally {
            setBusyId(null);
        }
    };

    const groups: Array<{ goal: RelationshipGoal | null; workflows: RelationshipWorkflow[] }> = [
        ...goals
            .map((goal) => ({
                goal,
                workflows: workflows.filter((workflow) => workflow.goalId === goal.id),
            }))
            .filter((group) => group.workflows.length > 0),
        {
            goal: null,
            workflows: workflows.filter(
                (workflow) => !workflow.goalId || !goals.some((goal) => goal.id === workflow.goalId),
            ),
        },
    ].filter((group) => group.workflows.length > 0);

    return (
        <div className="flex flex-col h-full relative">
            <PageHeader title="Workflows" onSearchClick={() => setCommandOpen(true)}>
                <Button size="sm" onClick={openNew}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    New workflow
                </Button>
            </PageHeader>

            <div className="flex-1 overflow-auto p-6 space-y-8">
                <div className="max-w-3xl">
                    <h2 className="text-2xl font-bold tracking-tight">How you stay in touch</h2>
                    <p className="text-muted-foreground mt-1 break-words">
                        Describe what you want in your own words, then review the exact scope, timing and wording
                        before anything runs. Goals are optional — people and conversations work fine without one.
                    </p>
                </div>

                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Goals
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGoalDialog({ open: true, goal: null })}
                        >
                            <Target className="h-3.5 w-3.5 mr-1.5" />
                            New goal
                        </Button>
                    </div>

                    {goals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No goals yet. You can group workflows under one, or skip goals entirely.
                        </p>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {goals.map((goal) => (
                                <Card key={goal.id} className="min-w-0">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base break-words">{goal.title}</CardTitle>
                                            <StatusBadge status={goal.status} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <p className="text-sm text-muted-foreground break-words">
                                            {goal.intent || "No intent written yet."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex flex-wrap gap-1.5 pt-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setGoalDialog({ open: true, goal })}
                                            disabled={busyId === goal.id}
                                        >
                                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                            Edit
                                        </Button>
                                        {goal.status === "active" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setGoalStatus(goal, "paused")}
                                                disabled={busyId === goal.id}
                                            >
                                                <Pause className="h-3.5 w-3.5 mr-1.5" />
                                                Pause
                                            </Button>
                                        )}
                                        {goal.status !== "active" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setGoalStatus(goal, "active")}
                                                disabled={busyId === goal.id}
                                            >
                                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                                Reactivate
                                            </Button>
                                        )}
                                        {goal.status !== "archived" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setGoalStatus(goal, "archived")}
                                                disabled={busyId === goal.id}
                                            >
                                                <Archive className="h-3.5 w-3.5 mr-1.5" />
                                                Archive
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Workflows
                    </h3>

                    {loading && workflows.length === 0 && (
                        <p className="text-sm text-muted-foreground">Loading workflows…</p>
                    )}

                    {!loading && workflows.length === 0 && (
                        <Card>
                            <CardContent className="p-6 space-y-2">
                                <p className="font-medium">No workflows yet</p>
                                <p className="text-sm text-muted-foreground break-words">
                                    Create one here, or open a person and choose “Stay in touch” to start from a
                                    relationship you already have. Nothing is sent without your approval.
                                </p>
                                <Button size="sm" className="mt-2" onClick={openNew}>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    New workflow
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {groups.map((group) => (
                        <div key={group.goal?.id ?? "no-goal"} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium break-words">
                                    {group.goal ? group.goal.title : "No goal"}
                                </h4>
                                {group.goal && <StatusBadge status={group.goal.status} />}
                                <span className="text-xs text-muted-foreground">
                                    {group.workflows.length}{" "}
                                    {group.workflows.length === 1 ? "workflow" : "workflows"}
                                </span>
                            </div>

                            <div className="grid gap-3">
                                {group.workflows.map((workflow) => {
                                    const busy = busyId === workflow.id;
                                    const actionLabels = Array.from(
                                        new Set(
                                            workflow.spec.rules.map((rule) =>
                                                rule.action === "email_draft"
                                                    ? "draft an email for my review"
                                                    : "remind me",
                                            ),
                                        ),
                                    );
                                    return (
                                        <Card key={workflow.id} className="min-w-0">
                                            <CardHeader className="pb-2">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <CardTitle className="text-base break-words min-w-0">
                                                        {workflow.title}
                                                    </CardTitle>
                                                    <StatusBadge status={workflow.status} />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {workflow.intent && (
                                                    <p className="text-sm text-muted-foreground break-words">
                                                        {workflow.intent}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Users className="h-3.5 w-3.5 shrink-0" />
                                                    {workflow.spec.contactIds.length}{" "}
                                                    {workflow.spec.contactIds.length === 1 ? "person" : "people"}
                                                </div>
                                                <ul className="space-y-1 text-sm">
                                                    {workflow.spec.rules.map((rule) => (
                                                        <li key={rule.id} className="break-words">
                                                            {describeRule(rule)}
                                                        </li>
                                                    ))}
                                                    {workflow.spec.rules.length === 0 && (
                                                        <li className="text-muted-foreground">No rules defined.</li>
                                                    )}
                                                </ul>
                                                <p className="text-xs text-muted-foreground break-words">
                                                    Actions: {actionLabels.length > 0 ? actionLabels.join(", ") : "none"}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    <span>Last updated {new Date(workflow.updatedAt).toLocaleString()}</span>
                                                    <span className="font-medium text-foreground">
                                                        Every email needs your approval.
                                                    </span>
                                                </div>
                                                {conflict?.id === workflow.id && (
                                                    <p className="text-xs text-destructive break-words">
                                                        {conflict.message}
                                                    </p>
                                                )}
                                            </CardContent>
                                            <CardFooter className="flex flex-wrap gap-1.5 pt-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(workflow)}
                                                    disabled={busy}
                                                >
                                                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                                    Edit
                                                </Button>
                                                {(workflow.status === "draft" || workflow.status === "paused") && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setWorkflowStatus(workflow, "active")}
                                                        disabled={busy || workflow.spec.contactIds.length === 0}
                                                        title={
                                                            workflow.spec.contactIds.length === 0
                                                                ? "Add at least one person before activating."
                                                                : undefined
                                                        }
                                                    >
                                                        {busy ? (
                                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                        ) : (
                                                            <Play className="h-3.5 w-3.5 mr-1.5" />
                                                        )}
                                                        Activate
                                                    </Button>
                                                )}
                                                {workflow.status === "active" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setWorkflowStatus(workflow, "paused")}
                                                        disabled={busy}
                                                    >
                                                        {busy ? (
                                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                        ) : (
                                                            <Pause className="h-3.5 w-3.5 mr-1.5" />
                                                        )}
                                                        Pause
                                                    </Button>
                                                )}
                                                {workflow.status !== "archived" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setWorkflowStatus(workflow, "archived")}
                                                        disabled={busy}
                                                    >
                                                        <ArchiveRestore className="h-3.5 w-3.5 mr-1.5 rotate-180" />
                                                        Archive
                                                    </Button>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>
            </div>

            {dialogOpen && (
                <WorkflowDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    workflow={editing}
                    goalId={dialogGoalId}
                />
            )}

            {goalDialog.open && (
                <GoalDialog
                    key={goalDialog.goal?.id ?? "new-goal"}
                    open={goalDialog.open}
                    onOpenChange={(open) => setGoalDialog({ open, goal: null })}
                    goal={goalDialog.goal}
                    onSubmit={async (args) => {
                        await saveGoal(args);
                        toast.success(args.id ? "Goal saved" : "Goal created");
                    }}
                />
            )}
        </div>
    );
}
