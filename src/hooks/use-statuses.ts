import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Status } from "@/types/crm";
import { useErrors } from "@/hooks/use-errors";

export function useStatuses() {
    const { handleError } = useErrors();
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStatuses = useCallback(async () => {
        setLoading(true);
        try {
            const data = await invoke<Status[]>("get_statuses");
            setStatuses(data);
        } catch (e) {
            handleError(e, "Failed to load pipeline stages");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    const addStatus = async (label: string, color: string) => {
        const id = await invoke<string>("create_status", { label, color });
        await fetchStatuses();
        return id;
    };

    const editStatus = async (id: string, label: string, color: string) => {
        await invoke("update_status", { id, label, color });
        await fetchStatuses();
    };

    const removeStatus = async (id: string) => {
        await invoke("delete_status", { id });
        await fetchStatuses();
    };

    return {
        statuses,
        loading,
        refreshStatuses: fetchStatuses,
        addStatus,
        editStatus,
        removeStatus
    };
}
