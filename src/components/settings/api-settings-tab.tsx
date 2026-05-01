import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, RefreshCw, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useErrors } from "@/hooks/use-errors";
import { useSettings } from "@/hooks/use-settings";
import type { ToolStatus } from "@/types/crm";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";

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
    }, []);

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
