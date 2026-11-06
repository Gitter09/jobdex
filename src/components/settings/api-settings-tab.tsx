import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, RefreshCw, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldAlert, Search } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useErrors } from "@/hooks/use-errors";
import { useSettings } from "@/hooks/use-settings";
import type { AccessMode, ApiRelationshipScope, Contact, ToolStatus } from "@/types/crm";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ApiStatus {
    enabled: boolean;
    port: number;
    keySet: boolean;
}

export function ApiSettingsTab() {
    const { handleError } = useErrors();
    const handleErrorRef = useRef(handleError);
    handleErrorRef.current = handleError;

    const { settings, updateSetting } = useSettings();
    const [status, setStatus] = useState<ApiStatus | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [portValue, setPortValue] = useState("13420");
    const [toggling, setToggling] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [tools, setTools] = useState<ToolStatus[]>([]);
    const [loadingTools, setLoadingTools] = useState(false);

    // External-agent scope
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [access, setAccess] = useState<AccessMode>("read");
    const [allowedContactIds, setAllowedContactIds] = useState<string[]>([]);
    const [allowContactCreation, setAllowContactCreation] = useState(false);
    const [contactFilter, setContactFilter] = useState("");
    const [savingScope, setSavingScope] = useState(false);

    const fetchScope = useCallback(async () => {
        try {
            const [scope, people] = await Promise.all([
                invoke<ApiRelationshipScope>("get_api_relationship_scope"),
                invoke<Contact[]>("get_contacts"),
            ]);
            setAccess(scope.access);
            setAllowedContactIds(scope.allowedContactIds);
            setAllowContactCreation(scope.allowContactCreation);
            setContacts(people);
        } catch (error) {
            handleErrorRef.current(error, "Couldn't load API access scope");
        }
    }, []);

    const handleSaveScope = async () => {
        setSavingScope(true);
        try {
            const scope = await invoke<ApiRelationshipScope>("set_api_relationship_scope", {
                access,
                allowedContactIds,
                allowContactCreation,
            });
            setAccess(scope.access);
            setAllowedContactIds(scope.allowedContactIds);
            setAllowContactCreation(scope.allowContactCreation);
            toast.success("API access scope saved.");
        } catch (error) {
            handleError(error, "Couldn't save API access scope");
        } finally {
            setSavingScope(false);
        }
    };

    const fetchStatus = useCallback(async () => {
        try {
            const s = await invoke<ApiStatus>("get_api_status");
            setStatus(s);
            setPortValue(String(s.port));
        } catch (error) {
            handleErrorRef.current(error, "Couldn't load API status");
        }
    }, []);

    const fetchTools = useCallback(async () => {
        setLoadingTools(true);
        try {
            const result = await invoke<ToolStatus[]>("detect_ai_tools");
            setTools(result);
        } catch (error) {
            handleErrorRef.current(error, "Couldn't detect AI tools");
        } finally {
            setLoadingTools(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchTools();
        fetchScope();
    }, [fetchStatus, fetchTools, fetchScope]);

    const handleToggle = async () => {
        if (!status) return;
        setToggling(true);
        try {
            const newValue = !status.enabled;
            await updateSetting("api_enabled", newValue ? "true" : "false");
            setStatus({ ...status, enabled: newValue });
            toast.success(newValue ? "API enabled. Restart JobDex for changes to take effect." : "API disabled. Restart JobDex for changes to take effect.");
        } catch (error) {
            handleError(error, "Failed to toggle API");
        } finally {
            setToggling(false);
        }
    };

    const handlePortChange = async () => {
        const port = parseInt(portValue, 10);
        if (isNaN(port) || port < 1024 || port > 65535) {
            toast.error("Port must be between 1024 and 65535");
            return;
        }
        try {
            await updateSetting("api_port", portValue);
            toast.success("Port saved. Restart JobDex for changes to take effect.");
        } catch (error) {
            handleError(error, "Failed to save port");
        }
    };

    const handleGenerateKey = async () => {
        setGeneratingKey(true);
        try {
            const key = await invoke<string>("generate_api_key");
            setApiKey(key);
            setShowKey(true);
            if (status) setStatus({ ...status, keySet: true });
            toast.success("New API key generated. Previous keys are invalidated.");
            await fetchTools();
        } catch (error) {
            handleError(error, "Failed to generate API key");
        } finally {
            setGeneratingKey(false);
        }
    };

    const handleConnect = async (toolId: string) => {
        try {
            await invoke("configure_ai_tool", { tool: toolId });
            const toolLabel = tools.find((t) => t.tool === toolId)?.label ?? toolId;
            toast.success(`Connected! Restart ${toolLabel} to complete setup.`);
            await fetchTools();
        } catch (error) {
            handleError(error, "Failed to connect tool");
        }
    };

    const handleDisconnect = async (toolId: string) => {
        try {
            await invoke("remove_ai_tool_config", { tool: toolId });
            const toolLabel = tools.find((t) => t.tool === toolId)?.label ?? toolId;
            toast.success(`Disconnected ${toolLabel}.`);
            await fetchTools();
        } catch (error) {
            handleError(error, "Failed to disconnect tool");
        }
    };

    const currentKey = apiKey || (settings.api_key ?? "");

    const scopedQuery = contactFilter.trim().toLowerCase();
    const filteredContacts = scopedQuery
        ? contacts.filter((contact) => {
              const label = `${contact.first_name ?? ""} ${contact.last_name ?? ""} ${contact.email ?? ""}`.toLowerCase();
              return label.includes(scopedQuery);
          })
        : contacts;

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(true);
            toast.success("API key copied to clipboard");
            setTimeout(() => setCopiedKey(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    External agents are limited to organizing people
                </p>
                <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                    <p>
                        Sending or scheduling email, deleting contacts, importing data, reading contact files, changing
                        email accounts, editing settings, and exporting or clearing data are no longer available over the
                        API. Agent-written email must be proposed and then approved in the native app before it is sent.
                    </p>
                    <p>
                        There is no legacy unrestricted override. An existing API key sees no people or messages until
                        you select a scope below.
                    </p>
                </div>
            </div>

            <SettingSection title="External agent access">
                <div className="space-y-4 p-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="api-access-mode">Access mode</Label>
                        <Select value={access} onValueChange={(value) => setAccess(value as AccessMode)}>
                            <SelectTrigger id="api-access-mode" className="w-full sm:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="read">Read only</SelectItem>
                                <SelectItem value="organize">Read and organize</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Read only exposes the people and messages in scope. Read and organize additionally allows
                            creating or updating scoped people, assigning tags, and adding user events. Even in organize
                            mode an external agent can never approve or send email — that requires you, in the native app.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="api-contact-filter">People in scope</Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Empty scope exposes no people or messages at all. This is separate from the AI disclosure
                            consent in the relationship agent settings; changing one never changes the other.
                        </p>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="api-contact-filter"
                                value={contactFilter}
                                onChange={(e) => setContactFilter(e.target.value)}
                                placeholder="Filter contacts"
                                className="pl-8 h-8 text-sm"
                            />
                        </div>
                        <div className="max-h-56 overflow-y-auto rounded-md border">
                            {filteredContacts.length === 0 ? (
                                <p className="px-3 py-4 text-sm text-muted-foreground">
                                    {contacts.length === 0
                                        ? "No contacts yet. Nothing is exposed until you add people and scope them."
                                        : "No contacts match that filter."}
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {filteredContacts.map((contact) => {
                                        const id = `api-scope-${contact.id}`;
                                        const name =
                                            `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                                            contact.email ||
                                            "Unnamed contact";
                                        return (
                                            <li key={contact.id}>
                                                <label
                                                    htmlFor={id}
                                                    className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40"
                                                >
                                                    <Checkbox
                                                        id={id}
                                                        checked={allowedContactIds.includes(contact.id)}
                                                        onCheckedChange={() =>
                                                            setAllowedContactIds((current) =>
                                                                current.includes(contact.id)
                                                                    ? current.filter((value) => value !== contact.id)
                                                                    : [...current, contact.id]
                                                            )
                                                        }
                                                        className="mt-0.5"
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-medium break-words">
                                                            {name}
                                                        </span>
                                                        {contact.email && (
                                                            <span className="block text-xs text-muted-foreground break-all">
                                                                {contact.email}
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {allowedContactIds.length === 0
                                ? "No one in scope."
                                : `${allowedContactIds.length} ${allowedContactIds.length === 1 ? "person" : "people"} in scope.`}
                        </p>
                    </div>

                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="api-allow-creation"
                            checked={allowContactCreation}
                            onCheckedChange={(value) => setAllowContactCreation(value === true)}
                            className="mt-0.5"
                        />
                        <Label htmlFor="api-allow-creation" className="text-sm font-normal leading-relaxed">
                            Allow external contact creation
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                Off by default. Newly created contacts are added only to this API scope — never to AI
                                disclosure consent.
                            </span>
                        </Label>
                    </div>

                    <Button onClick={handleSaveScope} disabled={savingScope}>
                        {savingScope && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save scope
                    </Button>
                </div>
            </SettingSection>

            <SettingSection title="Server">
                <SettingRow
                    label="Enable API server"
                    description={status?.enabled ? "Running — external tools can connect." : "Disabled — no connections accepted."}
                >
                    <Button
                        variant={status?.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggle}
                        disabled={toggling || !status}
                    >
                        {toggling ? "Saving…" : status?.enabled ? "Enabled" : "Disabled"}
                    </Button>
                </SettingRow>
                <SettingRow
                    label="Port"
                    description="Listens on 127.0.0.1. Changes take effect after restart."
                >
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={portValue}
                            onChange={(e) => setPortValue(e.target.value)}
                            className="w-20 text-center text-sm h-8"
                            min={1024}
                            max={65535}
                            disabled={!status?.enabled}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePortChange}
                            disabled={!status?.enabled || portValue === String(status?.port)}
                        >
                            Save
                        </Button>
                    </div>
                </SettingRow>
            </SettingSection>

            <SettingSection title="API Key">
                {currentKey ? (
                    <>
                        <SettingRow label="Secret key" description="Required for all API requests. Keep it safe.">
                            <div className="flex items-center gap-1.5">
                                <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                                    {showKey ? currentKey : "••••••••••••••••••••••••••••••"}
                                </code>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
                                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(currentKey)}>
                                    {copiedKey ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        </SettingRow>
                        <SettingRow label="Regenerate" description="Invalidates the existing key. Update any connected tools afterward.">
                            <Button variant="outline" size="sm" onClick={handleGenerateKey} disabled={generatingKey}>
                                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${generatingKey ? "animate-spin" : ""}`} />
                                {generatingKey ? "Generating…" : "New key"}
                            </Button>
                        </SettingRow>
                    </>
                ) : (
                    <SettingRow label="No key yet" description="Generate a key to enable API access and connect AI tools.">
                        <Button size="sm" onClick={handleGenerateKey} disabled={generatingKey}>
                            {generatingKey ? "Generating…" : "Generate key"}
                        </Button>
                    </SettingRow>
                )}
            </SettingSection>

            <SettingSection
                title="Connected tools"
                action={
                    <button
                        onClick={fetchTools}
                        disabled={loadingTools}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Refresh tool detection"
                    >
                        {loadingTools
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />
                        }
                    </button>
                }
            >
                {!currentKey && (
                    <div className="px-4 py-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10">
                        Generate an API key above before connecting tools.
                    </div>
                )}
                {loadingTools ? (
                    <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Detecting installed tools…
                    </div>
                ) : tools.length === 0 ? (
                    <div className="px-4 py-3.5 text-sm text-muted-foreground">
                        No supported tools detected.
                    </div>
                ) : (
                    tools.map((tool) => (
                        <ToolRow
                            key={tool.tool}
                            tool={tool}
                            onConnect={handleConnect}
                            onDisconnect={handleDisconnect}
                        />
                    ))
                )}
            </SettingSection>

            <p className="text-xs text-muted-foreground px-1">
                Enabling or disabling the API, or changing the port, takes effect after restarting JobDex. Your API key works immediately.
            </p>
        </div>
    );
}

function ToolRow({
    tool,
    onConnect,
    onDisconnect,
}: {
    tool: ToolStatus;
    onConnect: (id: string) => Promise<void>;
    onDisconnect: (id: string) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);

    const handleAction = async () => {
        setLoading(true);
        try {
            if (tool.isConfigured) await onDisconnect(tool.tool);
            else await onConnect(tool.tool);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SettingRow
            label={tool.label}
            description={tool.transport === "stdio" ? "Stdio transport" : "SSE transport"}
        >
            <div className="flex items-center gap-2">
                {tool.isConfigured ? (
                    <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 font-normal">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                        Connected
                    </Badge>
                ) : tool.isDetected ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        Detected
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground font-normal">
                        <XCircle className="h-2.5 w-2.5 mr-1" />
                        Not found
                    </Badge>
                )}
                {tool.isConfigured ? (
                    <Button variant="outline" size="sm" onClick={handleAction} disabled={loading} className="text-xs">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                    </Button>
                ) : tool.isDetected ? (
                    <Button size="sm" onClick={handleAction} disabled={loading} className="text-xs">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" disabled className="text-xs text-muted-foreground">
                        Not installed
                    </Button>
                )}
            </div>
        </SettingRow>
    );
}
