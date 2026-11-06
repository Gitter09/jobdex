import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
    AlertTriangle,
    CheckCircle2,
    KeyRound,
    Loader2,
    Pause,
    Play,
    Search,
    ShieldCheck,
    Trash2,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { useErrors } from "@/hooks/use-errors";
import { useRelationshipAgent } from "@/hooks/use-relationship-agent";
import type { Contact } from "@/types/crm";

export function RelationshipAgentSettingsTab() {
    const { handleError } = useErrors();
    const handleErrorRef = useRef(handleError);
    handleErrorRef.current = handleError;

    const { modelStatus, configureModel, testModel, disconnectModel, setPaused } = useRelationshipAgent();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [baseUrl, setBaseUrl] = useState("");
    const [model, setModel] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [enabled, setEnabled] = useState(false);
    const [dailyLimit, setDailyLimit] = useState("20");
    const [allowedIds, setAllowedIds] = useState<string[]>([]);
    const [contactFilter, setContactFilter] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [togglingPause, setTogglingPause] = useState(false);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const hydrated = useRef(false);

    const loadContacts = useCallback(async () => {
        try {
            const result = await invoke<Contact[]>("get_contacts");
            setContacts(result);
        } catch (error) {
            handleErrorRef.current(error, "Couldn't load contacts");
        }
    }, []);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    // Fill the form once, so a background status refresh never overwrites unsaved edits.
    useEffect(() => {
        if (!modelStatus || hydrated.current) return;
        hydrated.current = true;
        setBaseUrl(modelStatus.baseUrl ?? "");
        setModel(modelStatus.model ?? "");
        setEnabled(modelStatus.enabled);
        setDailyLimit(String(modelStatus.dailyRequestLimit ?? 20));
        setAllowedIds(modelStatus.allowedContactIds ?? []);
    }, [modelStatus]);

    const filteredContacts = useMemo(() => {
        const query = contactFilter.trim().toLowerCase();
        if (!query) return contacts;
        return contacts.filter((contact) => {
            const haystack =
                `${contact.first_name ?? ""} ${contact.last_name ?? ""} ${contact.email ?? ""}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [contacts, contactFilter]);

    const handleSave = async () => {
        setFormError(null);

        const trimmedModel = model.trim();
        const trimmedUrl = baseUrl.trim();
        const limit = Number.parseInt(dailyLimit, 10);

        if (trimmedUrl && !/^https:\/\//i.test(trimmedUrl)) {
            setFormError("The base URL must start with https://");
            return;
        }
        if (trimmedModel.length > 200) {
            setFormError("The model identifier must be 200 characters or fewer.");
            return;
        }
        if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
            setFormError("The daily request limit must be a whole number between 1 and 100.");
            return;
        }
        if (enabled && !trimmedModel) {
            setFormError("Add a model identifier before enabling AI features.");
            return;
        }

        setSaving(true);
        try {
            await configureModel(
                {
                    baseUrl: trimmedUrl,
                    model: trimmedModel,
                    enabled,
                    dailyRequestLimit: limit,
                    allowedContactIds: allowedIds,
                },
                apiKey.trim() || undefined
            );
            setApiKey("");
            toast.success("Relationship agent settings saved.");
        } catch (error) {
            handleError(error, "Couldn't save relationship agent settings");
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            await testModel();
            toast.success("Connection verified.");
        } catch {
            // The hook surfaces the failure; the status block below shows the stored error.
        } finally {
            setTesting(false);
        }
    };

    const handlePauseToggle = async () => {
        if (!modelStatus) return;
        setTogglingPause(true);
        try {
            await setPaused(!modelStatus.paused);
        } catch {
            // handled by the hook
        } finally {
            setTogglingPause(false);
        }
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await disconnectModel();
            setApiKey("");
            setEnabled(false);
            hydrated.current = false;
            toast.success("Disconnected. The stored key was removed.");
            setConfirmDisconnect(false);
        } catch (error) {
            handleError(error, "Couldn't disconnect the agent");
        } finally {
            setDisconnecting(false);
        }
    };

    const connectionState = !modelStatus
        ? "loading"
        : !modelStatus.configured
          ? "unconfigured"
          : modelStatus.connectionVerified
            ? "verified"
            : "unverified";

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    JobDex works without AI
                </p>
                <p className="mt-1 leading-relaxed">
                    People, notes, reminders and manual email all work with no provider configured. Connecting a
                    provider adds memory suggestions and draft writing. JobDex is free; inference is billed by the
                    provider you choose, directly to you.
                </p>
            </div>

            <SettingSection title="Provider">
                <div className="space-y-4 p-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="agent-base-url">Base URL</Label>
                        <Input
                            id="agent-base-url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            autoComplete="off"
                            spellCheck={false}
                            className="break-all"
                        />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Any HTTPS service exposing an OpenAI-compatible chat-completions endpoint. Credentials,
                            query strings and redirects are rejected. Changing the endpoint removes the stored key,
                            so it is never sent to a different host — enter it again after saving.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="agent-model">Model</Label>
                        <Input
                            id="agent-model"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="gpt-4o-mini"
                            autoComplete="off"
                            spellCheck={false}
                            className="break-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="agent-api-key" className="flex items-center gap-1.5">
                            <KeyRound className="h-3.5 w-3.5" />
                            API key
                        </Label>
                        <Input
                            id="agent-api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={
                                modelStatus?.configured
                                    ? "A key is already stored — leave blank to keep it"
                                    : "Paste the provider's API key"
                            }
                            autoComplete="new-password"
                            spellCheck={false}
                            className="break-all"
                        />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Stored in your operating system's keychain. It is never shown again, never returned to the
                            interface, and never included in API, MCP or log output.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save settings
                        </Button>
                        {formError && (
                            <p className="text-xs text-destructive break-words" role="alert">
                                {formError}
                            </p>
                        )}
                    </div>
                </div>
            </SettingSection>

            <SettingSection title="Connection">
                <SettingRow
                    label="Test connection"
                    description="AI features stay disabled until a structured test request succeeds. Endpoints that do not return a usable structured response are rejected rather than guessed at."
                >
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTest}
                        disabled={testing || connectionState === "unconfigured" || connectionState === "loading"}
                    >
                        {testing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Test connection
                    </Button>
                </SettingRow>
                <div className="px-4 py-3.5">
                    {connectionState === "loading" && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking status…
                        </p>
                    )}
                    {connectionState === "unconfigured" && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4 shrink-0" />
                            Not configured. Save a provider and model to test.
                        </p>
                    )}
                    {connectionState === "unverified" && (
                        <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Not verified yet. Run Test connection before enabling AI features.
                        </p>
                    )}
                    {connectionState === "verified" && (
                        <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Verified — the provider answered with a valid structured response.
                        </p>
                    )}
                </div>
            </SettingSection>

            <SettingSection title="Disclosure consent">
                <div className="space-y-3 p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Only the people you select here can be sent to the provider. For each selected person, JobDex
                        may send their synced plain-text conversations, contact summary and confirmed notes. Excluded:
                        attachments, contact files, access tokens, HTML bodies, and messages from anyone else. This is a
                        separate decision from syncing email into JobDex, and neither is required to use the app.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Unchecking someone deletes queued processing for them and invalidates drafts derived from them.
                        It cannot recall data that was already transmitted.
                    </p>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={contactFilter}
                            onChange={(e) => setContactFilter(e.target.value)}
                            placeholder="Filter contacts"
                            aria-label="Filter contacts"
                            className="pl-8 h-8 text-sm"
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-md border">
                        {filteredContacts.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-muted-foreground">
                                {contacts.length === 0
                                    ? "No contacts yet. Add people first; nothing is shared until you select them."
                                    : "No contacts match that filter."}
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {filteredContacts.map((contact) => {
                                    const id = `agent-consent-${contact.id}`;
                                    return (
                                        <li key={contact.id}>
                                            <label
                                                htmlFor={id}
                                                className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40"
                                            >
                                                <Checkbox
                                                    id={id}
                                                    checked={allowedIds.includes(contact.id)}
                                                    onCheckedChange={() =>
                                                        setAllowedIds((current) =>
                                                            current.includes(contact.id)
                                                                ? current.filter((value) => value !== contact.id)
                                                                : [...current, contact.id]
                                                        )
                                                    }
                                                    className="mt-0.5"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium break-words">
                                                        {`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                                                            contact.email ||
                                                            "Unnamed contact"}
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
                        {allowedIds.length === 0
                            ? "No one selected — the provider receives no contact content."
                            : `${allowedIds.length} ${allowedIds.length === 1 ? "person" : "people"} selected.`}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Save consent
                    </Button>
                </div>
            </SettingSection>

            <SettingSection title="Usage and limits">
                <SettingRow
                    label="Daily request limit"
                    description="Counts outbound model requests, including connection tests. It bounds the number of requests, not the cost — your provider bills per token, and that amount is not controlled here."
                >
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(e.target.value)}
                            aria-label="Daily request limit"
                            className="h-8 w-20 text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground">/ day</span>
                    </div>
                </SettingRow>
                <div className="px-4 py-3.5 text-sm">
                    <span className="font-medium">
                        {modelStatus ? `${modelStatus.requestsToday} of ${modelStatus.dailyRequestLimit}` : "—"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                        requests used today. The count resets on the UTC day boundary and survives restarts; failed
                        attempts count.
                    </span>
                </div>
            </SettingSection>

            <SettingSection title="Automation">
                <SettingRow
                    label="Enable AI features"
                    description={
                        modelStatus?.connectionVerified
                            ? "Allowed while unpaused and unlocked."
                            : "Requires a verified connection first."
                    }
                >
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="agent-enabled"
                            checked={enabled}
                            onCheckedChange={(value) => setEnabled(value === true)}
                            aria-label="Enable AI features"
                        />
                        <Label htmlFor="agent-enabled" className="text-sm font-normal">
                            {enabled ? "On" : "Off"}
                        </Label>
                    </div>
                </SettingRow>
                <SettingRow
                    label={modelStatus?.paused ? "Agent paused" : "Agent running"}
                    description="Pausing cancels queued and unclaimed work and clears approvals. It cannot retract a request already handed to the provider."
                >
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePauseToggle}
                        disabled={!modelStatus || togglingPause}
                    >
                        {togglingPause ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : modelStatus?.paused ? (
                            <Play className="mr-2 h-3.5 w-3.5" />
                        ) : (
                            <Pause className="mr-2 h-3.5 w-3.5" />
                        )}
                        {modelStatus?.paused ? "Resume" : "Pause"}
                    </Button>
                </SettingRow>
                <div className="px-4 py-3.5 text-xs text-muted-foreground leading-relaxed">
                    Every agent-written email still needs your approval in the native app before it is sent. Nothing
                    runs on a server, and nothing runs while JobDex is closed.
                </div>
            </SettingSection>

            {modelStatus?.lastError && (
                <SettingSection title="Last error">
                    <div className="p-4">
                        <p className="flex items-start gap-2 text-sm text-destructive break-words">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="break-words">{modelStatus.lastError}</span>
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Sanitized diagnostic. Prompts, contact content and the key are never included.
                        </p>
                    </div>
                </SettingSection>
            )}

            <SettingSection title="Disconnect">
                <SettingRow
                    label="Remove provider access"
                    description="Deletes the stored key from the keychain and stops AI features. Manual people, notes, reminders and email keep working."
                >
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDisconnect(true)}
                        disabled={!modelStatus?.configured}
                    >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Disconnect
                    </Button>
                </SettingRow>
            </SettingSection>

            <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect the provider?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The stored API key is removed from the keychain and AI features stop. Existing memory and
                            drafts stay, but nothing new is drafted or suggested. Manual tools keep working.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(event) => {
                                event.preventDefault();
                                handleDisconnect();
                            }}
                            disabled={disconnecting}
                        >
                            {disconnecting ? "Disconnecting…" : "Disconnect"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
