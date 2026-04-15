import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Plug, Copy, RefreshCw, Eye, EyeOff, AlertTriangle, Terminal } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useErrors } from "@/hooks/use-errors";
import { useSettings } from "@/hooks/use-settings";

interface ApiStatus {
    enabled: boolean;
    port: number;
    keySet: boolean;
}

export function ApiSettingsTab() {
    const { handleError } = useErrors();
    const { settings, updateSetting } = useSettings();
    const [status, setStatus] = useState<ApiStatus | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [portValue, setPortValue] = useState("13420");
    const [toggling, setToggling] = useState(false);
    const [copiedConfig, setCopiedConfig] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const s = await invoke<ApiStatus>("get_api_status");
            setStatus(s);
            setPortValue(String(s.port));
        } catch (error) {
            handleError(error, "Couldn't load API status");
        }
    }, [handleError]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

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
        } catch (error) {
            handleError(error, "Failed to generate API key");
        } finally {
            setGeneratingKey(false);
        }
    };

    const currentKey = apiKey || (settings.api_key ?? "");

    const mcpConfig = JSON.stringify(
        {
            mcpServers: {
                jobdex: {
                    command: "/path/to/jobdex-mcp",
                    args: [
                        "--api-url",
                        `http://127.0.0.1:${portValue}`,
                        "--api-key",
                        currentKey || "jd_YOUR_API_KEY_HERE",
                    ],
                },
            },
        },
        null,
        2
    );

    const copyToClipboard = async (text: string, label: string, setCopied: (v: boolean) => void) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success(`${label} copied to clipboard`);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium">API Access</h3>
                <p className="text-sm text-muted-foreground">
                    Allow external tools and AI agents to interact with your JobDex data programmatically.
                </p>
            </div>

            <Card className="border-primary/10 bg-primary/5">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Plug className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Local API Server</CardTitle>
                            <CardDescription className="text-xs">
                                Runs on your machine. Nothing is exposed to the internet.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Enable API Server</Label>
                            <p className="text-[11px] text-muted-foreground">
                                {status?.enabled
                                    ? "Running — external tools can connect."
                                    : "Disabled — no connections accepted."}
                            </p>
                        </div>
                        <Button
                            variant={status?.enabled ? "default" : "outline"}
                            size="sm"
                            onClick={handleToggle}
                            disabled={toggling || !status}
                        >
                            {toggling ? "Saving..." : status?.enabled ? "Enabled" : "Disabled"}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Port</Label>
                            <p className="text-[11px] text-muted-foreground">
                                The API listens on 127.0.0.1 at this port. Changes take effect after restart.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={portValue}
                                onChange={(e) => setPortValue(e.target.value)}
                                className="w-24 text-center text-sm"
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
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">API Key</CardTitle>
                            <CardDescription className="text-xs">
                                Required for all API requests. Keep it safe — it gives full read/write access to your data.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {currentKey ? (
                        <div className="p-4 rounded-lg bg-background border space-y-3">
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all select-all overflow-hidden">
                                    {showKey ? currentKey : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(currentKey, "API key", setCopiedKey)}
                                >
                                    {copiedKey ? "Copied" : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateKey}
                                disabled={generatingKey}
                            >
                                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${generatingKey ? "animate-spin" : ""}`} />
                                {generatingKey ? "Generating..." : "Generate New Key"}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">
                                Generating a new key invalidates the old one. Update any tools using the old key.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg bg-muted/50 border border-dashed text-center space-y-3">
                            <p className="text-sm text-muted-foreground">No API key yet.</p>
                            <Button size="sm" onClick={handleGenerateKey} disabled={generatingKey}>
                                <Key className="h-3.5 w-3.5 mr-2" />
                                {generatingKey ? "Generating..." : "Generate API Key"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Terminal className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">MCP Configuration</CardTitle>
                            <CardDescription className="text-xs">
                                Add this to your Claude Desktop, Cursor, or Windsurf config to connect an AI assistant.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <pre className="text-xs font-mono bg-muted/50 border rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                        {mcpConfig}
                    </pre>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(mcpConfig, "MCP config", setCopiedConfig)}
                        disabled={!currentKey}
                    >
                        {copiedConfig ? "Copied!" : <><Copy className="h-3.5 w-3.5 mr-2" />Copy Config</>}
                    </Button>
                </CardContent>
            </Card>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Changes require restart</p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-normal">
                        Enabling or disabling the API, or changing the port, takes effect after you restart JobDex. Your API key is ready immediately.
                    </p>
                </div>
            </div>
        </div>
    );
}