import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tag } from "@/types/crm";

export function useTags() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTags = useCallback(async () => {
        setLoading(true);
        try {
            const data = await invoke<Tag[]>("get_tags");
            setTags(data);
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    const createTag = async (name: string, color: string) => {
        const id = await invoke<string>("create_tag", { name, color });
        await fetchTags();
        return id;
    };

    const updateTag = async (id: string, name: string, color: string) => {
        await invoke("update_tag", { id, name, color });
        await fetchTags();
    };

    const deleteTag = async (id: string) => {
        await invoke("delete_tag", { id });
        await fetchTags();
    };

    const assignTag = async (contactId: string, tagId: string) => {
        await invoke("assign_tag", { contactId, tagId });
        // NOTE: Does not automatically refresh contacts list unless caller does it
    };

    const unassignTag = async (contactId: string, tagId: string) => {
        await invoke("unassign_tag", { contactId, tagId });
    };

    return {
        tags,
        loading,
        fetchTags,
        createTag,
        updateTag,
        deleteTag,
        assignTag,
        unassignTag
    };
}
