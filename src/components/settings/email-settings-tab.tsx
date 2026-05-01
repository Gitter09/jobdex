import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Key, Loader2, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useErrors } from "@/hooks/use-errors";
import { EmailAccount, EmailSignature, SyncResult } from "@/types/crm";
import { EditSignatureDialog } from "@/components/settings/EditSignatureDialog";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";

export function EmailSettingsTab() {
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const { handleError } = useErrors();
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState<"gmail" | "outlook" | null>(null);
    const [setupProvider, setSetupProvider] = useState<"gmail" | "outlook" | null>(null);
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [signatures, setSignatures] = useState<EmailSignature[]>([]);
    const [editSignature, setEditSignature] = useState<EmailSignature | undefined>(undefined);
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

    const fetchSignatures = async () => {
        try {
            const data = await invoke<EmailSignature[]>("get_signatures");
            setSignatures(data);
        } catch (e) {
            handleError(e, "Failed to fetch signatures");
        }
    };

    const handleDeleteSignature = async (id: string) => {
        try {
            await invoke("delete_signature", { id });
            toast.success("Signature deleted");
            setSignatures((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            handleError(e, "Failed to delete signature");
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data = await invoke<EmailAccount[]>("get_email_accounts");
            setAccounts(data);
        } catch (e) {
            handleError(e, "Failed to fetch email accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        fetchSignatures();
    }, []);

    const handleSaveCredentials = async () => {
        if (!setupProvider || !clientId.trim()) {
            handleError("Please provide a Client ID");
            return;
        }
        if (setupProvider === "gmail" && !clientSecret.trim()) {
            handleError("Gmail requires a Client Secret");
            return;
        }
        setSaving(true);
        try {
            await invoke("save_email_credentials", {
                provider: setupProvider,
                clientId: clientId.trim(),
                clientSecret: clientSecret.trim(),
            });
            toast.success(`${setupProvider === "gmail" ? "Gmail" : "Outlook"} credentials saved successfully`);
            setClientId("");
            setClientSecret("");
        } catch (error) {
            handleError(error, "Failed to save credentials");
        } finally {
            setSaving(false);
        }
    };

    const handleConnect = async (provider: "gmail" | "outlook") => {
        setConnecting(provider);
        try {
            const command = provider === "gmail" ? "gmail_connect" : "outlook_connect";
            const result = await invoke<string>(command);
            toast.success(result);
            fetchAccounts();
        } catch (e: unknown) {
            const errorStr = (typeof e === "object" && e !== null && "message" in e) ? String(e.message) : String(e);
            if (errorStr.includes("credentials not configured") || errorStr.includes("disabled while in beta")) {
                setSetupProvider(provider);
            } else {
                handleError(e, `Failed to connect ${provider}`);
            }
        } finally {
            setConnecting(null);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await invoke("delete_email_account", { accountId: id });
            toast.success("Account disconnected");
            setAccounts(accounts.filter((a) => a.id !== id));
        } catch (error) {
            handleError(error, "Failed to disconnect account");
        }
    };

    const handleFullResync = async (accountId: string, accountEmail: string, provider: string) => {
        setSyncing(accountId + "_full");
        try {
            await invoke("reset_email_sync_state", { accountId });
            const result = await invoke<SyncResult>("sync_email_account", { accountId });
            if (result.token_expired) {
                toast.error(`Token expired for ${accountEmail}. Please reconnect your account.`, {
                    action: {
                        label: "Reconnect",
                        onClick: () => handleConnect(provider as "gmail" | "outlook"),
                    },
                });
            } else {
                toast.success(
                    `Full re-sync complete: ${result.synced_count} email${result.synced_count !== 1 ? "s" : ""} updated from ${accountEmail}`
                );
                fetchAccounts();
            }
        } catch (error) {
            handleError(error, `Full re-sync failed for ${accountEmail}`);
        } finally {
            setSyncing(null);
        }
    };

    const handleSyncAll = async () => {
        setSyncing("all");
        try {
            const results = await invoke<SyncResult[]>("sync_email_accounts");
            let totalSynced = 0;
            const expired: string[] = [];
            for (const result of results) {
                if (result.token_expired) expired.push(result.account_email);
                else totalSynced += result.synced_count;
            }
            if (totalSynced > 0) {
                toast.success(`Synced ${totalSynced} new email${totalSynced !== 1 ? "s" : ""} across all accounts`);
            } else if (expired.length === 0) {
                toast.success("All accounts up to date");
            }
            if (expired.length > 0) {
                handleError(`Token expired for: ${expired.join(", ")}. Please reconnect those accounts.`);
            }
            fetchAccounts();
        } catch (error) {
            handleError(error, "Sync failed");
        } finally {
            setSyncing(null);
        }
    };

    const getSetupGuideUrl = (provider: "gmail" | "outlook") => {
        if (provider === "gmail") return "https://console.cloud.google.com/apis/credentials";
        return "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade";
    };

    return (
        <div className="space-y-6">
            {/* Connect providers */}
            <SettingSection title="Connect">
                <SettingRow label="Gmail" description="Google Workspace or personal Gmail.">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect("gmail")}
                            disabled={connecting !== null}
                        >
                            {connecting === "gmail"
                                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Connecting…</>
                                : <><Plus className="mr-1.5 h-3.5 w-3.5" />Connect</>
                            }
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground px-2"
                            onClick={() => { setSetupProvider("gmail"); setShowAdvanced(true); }}
                        >
                            Custom credentials
                        </Button>
                    </div>
                </SettingRow>
                <SettingRow label="Outlook" description="Outlook or Microsoft 365.">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect("outlook")}
                            disabled={connecting !== null}
                        >
                            {connecting === "outlook"
                                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Connecting…</>
                                : <><Plus className="mr-1.5 h-3.5 w-3.5" />Connect</>
                            }
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground px-2"
                            onClick={() => { setSetupProvider("outlook"); setShowAdvanced(true); }}
                        >
                            Custom credentials
                        </Button>
                    </div>
                </SettingRow>
            </SettingSection>

            {/* Connected accounts */}
            <SettingSection
                title="Connected accounts"
                action={
                    <div className="flex items-center gap-1">
                        {accounts.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing !== null} className="h-7 text-xs gap-1.5">
                                {syncing === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                Sync all
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchAccounts} disabled={loading}>
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                }
            >
                {accounts.length === 0 ? (
                    <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                        No accounts connected yet.
                    </div>
                ) : (
                    accounts.map((account) => (
                        <SettingRow
                            key={account.id}
                            label={account.email}
                            description={[
                                account.provider.charAt(0).toUpperCase() + account.provider.slice(1),
                                `Connected ${new Date(account.created_at).toLocaleDateString()}`,
                                account.last_synced_at
                                    ? `Synced ${new Date(account.last_synced_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                    : null,
                            ].filter(Boolean).join(" · ")}
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-[10px] font-normal px-1.5">
                                    Active
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFullResync(account.id, account.email, account.provider)}
                                    disabled={syncing !== null}
                                    className="h-7 text-xs text-muted-foreground gap-1"
                                >
                                    {syncing === account.id + "_full"
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <RefreshCw className="h-3 w-3" />
                                    }
                                    Re-sync
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDelete(account.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </SettingRow>
                    ))
                )}
            </SettingSection>

            {/* Signatures */}
            <SettingSection
                title="Signatures"
                action={
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditSignature(undefined); setSignatureDialogOpen(true); }}
                    >
                        <Plus className="h-3 w-3" />
                        Add
                    </Button>
                }
            >
                {signatures.length === 0 ? (
                    <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                        No signatures yet.
                    </div>
                ) : (
                    signatures.map((sig) => (
                        <SettingRow key={sig.id} label={sig.name} description={sig.content.slice(0, 80) + (sig.content.length > 80 ? "…" : "")}>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground"
                                    onClick={() => { setEditSignature(sig); setSignatureDialogOpen(true); }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteSignature(sig.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </SettingRow>
                    ))
                )}
            </SettingSection>

            <EditSignatureDialog
                open={signatureDialogOpen}
                onOpenChange={setSignatureDialogOpen}
                signature={editSignature}
                onSuccess={fetchSignatures}
            />

            {/* Credential Setup Dialog */}
            <Dialog open={setupProvider !== null} onOpenChange={(open) => { if (!open) { setSetupProvider(null); setShowAdvanced(false); } }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {setupProvider === "gmail" ? "Gmail" : "Outlook"} credentials
                        </DialogTitle>
                        <DialogDescription>
                            Configure OAuth credentials to connect your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {!showAdvanced ? (
                            <div className="text-center py-4 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    Standard users can connect directly using the button on the previous screen.
                                    Only configure custom credentials if you have your own Cloud Console or Azure project.
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setShowAdvanced(true)} className="gap-2">
                                    <Key className="h-4 w-4" />
                                    Configure custom credentials
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                    <p className="text-xs font-medium">Step 1: Create an OAuth app</p>
                                    <p className="text-xs text-muted-foreground">
                                        {setupProvider === "gmail"
                                            ? "Go to Google Cloud Console and create a new OAuth 2.0 Client ID (Desktop app type)."
                                            : "Go to Azure Portal and register a new app with redirect URI: http://localhost:8420"}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-1"
                                        onClick={() => window.open(getSetupGuideUrl(setupProvider ?? "gmail"), "_blank")}
                                    >
                                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                        Open {setupProvider === "gmail" ? "Google Cloud Console" : "Azure Portal"}
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="client-id" className="text-xs">Client ID</Label>
                                        <Input
                                            id="client-id"
                                            placeholder="Enter your OAuth Client ID"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="client-secret" className="text-xs">
                                            Client Secret{" "}
                                            {setupProvider === "outlook" && (
                                                <span className="text-muted-foreground font-normal">(optional for public clients)</span>
                                            )}
                                        </Label>
                                        <Input
                                            id="client-secret"
                                            type="password"
                                            placeholder={setupProvider === "outlook" ? "Leave blank for mobile/desktop apps" : "Enter your OAuth Client Secret"}
                                            value={clientSecret}
                                            onChange={(e) => setClientSecret(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setSetupProvider(null); setShowAdvanced(false); }}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            {showAdvanced && (
                                <Button className="flex-1" onClick={handleSaveCredentials} disabled={saving}>
                                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save"}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
