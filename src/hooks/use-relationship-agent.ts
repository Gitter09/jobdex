import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useErrors } from "@/hooks/use-errors";
import type {
    AccessMode,
    ApiRelationshipScope,
    EmailDraftPayload,
    GoalStatus,
    MemoryKind,
    MemoryStatus,
    ModelStatus,
    RelationshipAction,
    RelationshipGoal,
    RelationshipMemory,
    RelationshipModelConfig,
    RelationshipWorkflow,
    ReviewDecision,
    WorkflowSpec,
    WorkflowStatus,
} from "@/types/crm";

export const RELATIONSHIP_CHANGED_EVENT = "relationship_agent_changed";

/**
 * Page-local relationship-agent state. Every mutation awaits the command and then
 * refreshes, and a global change event keeps other surfaces in sync.
 */
export function useRelationshipAgent(options: { autoLoad?: boolean } = {}) {
    const autoLoad = options.autoLoad ?? true;
    const { handleError } = useErrors();

    const [actions, setActions] = useState<RelationshipAction[]>([]);
    const [workflows, setWorkflows] = useState<RelationshipWorkflow[]>([]);
    const [goals, setGoals] = useState<RelationshipGoal[]>([]);
    const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
    const [loading, setLoading] = useState(autoLoad);

    const refresh = useCallback(async () => {
        try {
            const [nextActions, nextWorkflows, nextGoals, nextStatus] = await Promise.all([
                invoke<RelationshipAction[]>("list_relationship_actions"),
                invoke<RelationshipWorkflow[]>("list_relationship_workflows"),
                invoke<RelationshipGoal[]>("list_relationship_goals"),
                invoke<ModelStatus>("get_relationship_model_status"),
            ]);
            setActions(nextActions);
            setWorkflows(nextWorkflows);
            setGoals(nextGoals);
            setModelStatus(nextStatus);
        } catch (error) {
            handleError(error, "Failed to load relationship agent data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!autoLoad) return;
        refresh();
        const unlisten = listen(RELATIONSHIP_CHANGED_EVENT, () => {
            refresh();
        });
        return () => {
            unlisten.then((fn: () => void) => fn());
        };
    }, [autoLoad, refresh]);

    const createReminder = async (contactId: string, title: string, description: string, dueAt: string) => {
        try {
            const action = await invoke<RelationshipAction>("create_relationship_reminder", {
                contactId,
                title,
                description,
                dueAt,
            });
            await refresh();
            return action;
        } catch (error) {
            handleError(error, "Failed to create reminder");
            throw error;
        }
    };

    const editDraft = async (id: string, expectedRevision: number, payload: EmailDraftPayload) => {
        try {
            const action = await invoke<RelationshipAction>("edit_relationship_draft", {
                id,
                expectedRevision,
                payload,
            });
            await refresh();
            return action;
        } catch (error) {
            handleError(error, "Failed to save draft changes");
            throw error;
        }
    };

    const reviewAction = async (
        id: string,
        expectedRevision: number,
        decision: ReviewDecision,
        snoozedUntil?: string,
    ) => {
        try {
            const action = await invoke<RelationshipAction>("review_relationship_action", {
                id,
                expectedRevision,
                decision,
                snoozedUntil: snoozedUntil ?? null,
            });
            await refresh();
            return action;
        } catch (error) {
            handleError(error, "Failed to update this action");
            throw error;
        }
    };

    const retryAction = async (id: string) => {
        try {
            const action = await invoke<RelationshipAction>("retry_relationship_action", { id });
            await refresh();
            return action;
        } catch (error) {
            handleError(error, "Failed to retry this action");
            throw error;
        }
    };

    const sendAction = async (id: string) => {
        try {
            const action = await invoke<RelationshipAction>("send_relationship_action", { id });
            await refresh();
            return action;
        } catch (error) {
            handleError(error, "The email was not confirmed as sent");
            throw error;
        }
    };

    const saveWorkflow = async (args: {
        id?: string | null;
        expectedRevision?: number | null;
        title: string;
        intent: string;
        goalId?: string | null;
        spec: WorkflowSpec;
        status: WorkflowStatus;
    }) => {
        const workflow = await invoke<RelationshipWorkflow>("save_relationship_workflow", {
            id: args.id ?? null,
            expectedRevision: args.expectedRevision ?? null,
            title: args.title,
            intent: args.intent,
            goalId: args.goalId ?? null,
            spec: args.spec,
            status: args.status,
        });
        await refresh();
        return workflow;
    };

    const saveGoal = async (args: {
        id?: string | null;
        title: string;
        intent: string;
        status: GoalStatus;
    }) => {
        const goal = await invoke<RelationshipGoal>("save_relationship_goal", {
            id: args.id ?? null,
            title: args.title,
            intent: args.intent,
            status: args.status,
        });
        await refresh();
        return goal;
    };

    const refreshMemory = async (contactId: string) => {
        try {
            const memory = await invoke<RelationshipMemory[]>("refresh_relationship_memory", { contactId });
            await refresh();
            return memory;
        } catch (error) {
            handleError(error, "Could not summarize this relationship");
            throw error;
        }
    };

    const createMemory = async (
        contactId: string,
        kind: MemoryKind,
        text: string,
        dueAt?: string,
    ) => {
        const memory = await invoke<RelationshipMemory>("create_relationship_memory", {
            contactId,
            kind,
            text,
            dueAt: dueAt ?? null,
        });
        await refresh();
        return memory;
    };

    const updateMemory = async (
        id: string,
        text: string,
        dueAt: string | undefined,
        status: MemoryStatus,
    ) => {
        const memory = await invoke<RelationshipMemory>("update_relationship_memory", {
            id,
            text,
            dueAt: dueAt ?? null,
            status,
        });
        await refresh();
        return memory;
    };

    const configureModel = async (config: RelationshipModelConfig, apiKey?: string) => {
        const status = await invoke<ModelStatus>("configure_relationship_model", {
            config,
            apiKey: apiKey && apiKey.length > 0 ? apiKey : null,
        });
        await refresh();
        return status;
    };

    const testModel = async () => {
        try {
            const status = await invoke<ModelStatus>("test_relationship_model");
            await refresh();
            return status;
        } catch (error) {
            handleError(error, "Connection test failed");
            await refresh();
            throw error;
        }
    };

    const disconnectModel = async () => {
        await invoke("disconnect_relationship_model");
        await refresh();
    };

    const setPaused = async (paused: boolean) => {
        try {
            await invoke("set_relationship_agent_paused", { paused });
            await refresh();
        } catch (error) {
            handleError(error, paused ? "Failed to pause the agent" : "Failed to resume the agent");
            throw error;
        }
    };

    const setApiScope = async (
        access: AccessMode,
        allowedContactIds: string[],
        allowContactCreation: boolean,
    ) =>
        invoke<ApiRelationshipScope>("set_api_relationship_scope", {
            access,
            allowedContactIds,
            allowContactCreation,
        });

    return {
        actions,
        workflows,
        goals,
        modelStatus,
        loading,
        refresh,
        createReminder,
        editDraft,
        reviewAction,
        retryAction,
        sendAction,
        saveWorkflow,
        saveGoal,
        refreshMemory,
        createMemory,
        updateMemory,
        configureModel,
        testModel,
        disconnectModel,
        setPaused,
        setApiScope,
    };
}
