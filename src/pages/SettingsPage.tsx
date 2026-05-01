import { useEffect, useState } from "react";
import { useErrors } from "@/hooks/use-errors";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { EmailSettingsTab } from "@/components/settings/email-settings-tab";
import { SecuritySettingsTab } from "@/components/settings/security-settings-tab";
import { AboutTab } from "@/components/settings/about-tab";
import { PipelineSettingsTab } from "@/components/settings/pipeline-settings-tab";
import { KeyboardSettingsTab } from "@/components/settings/keyboard-settings-tab";
import { ApiSettingsTab } from "@/components/settings/api-settings-tab";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog, save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import type { ImportSummary } from "@/types/crm";
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
import { PageHeader } from "@/components/layout/page-header";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";

type SettingsTab = "email" | "appearance" | "pipeline" | "data" | "security" | "keyboard" | "about" | "api";

const NAV_ITEMS: { id: SettingsTab; label: string }[] = [
    { id: "appearance", label: "General" },
    { id: "email", label: "Email" },
    { id: "pipeline", label: "Pipeline" },
    { id: "security", label: "Security" },
    { id: "data", label: "Data" },
    { id: "keyboard", label: "Shortcuts" },
    { id: "api", label: "API" },
    { id: "about", label: "About" },
];

export function SettingsPage() {
    const { tab } = useParams<{ tab?: string }>();
    const navigate = useNavigate();
    const activeTab = (tab as SettingsTab) || "appearance";

    const { settings, updateSetting } = useSettings();
    const { handleError } = useErrors();

    const [autostart, setAutostart] = useState(false);
    const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    useEffect(() => {
        invoke<boolean>("is_background_service_enabled")
            .then(setAutostart)
            .catch(() => {});
    }, []);

    const handleAutostartToggle = async () => {
        try {
            if (autostart) {
                await invoke("disable_background_service");
                setAutostart(false);
                toast.success("Background service disabled");
            } else {
                await invoke("enable_background_service");
                setAutostart(true);
                toast.success("JobDex will run in the background on login");
            }
        } catch (error) {
            handleError(error, "Failed to toggle background service");
        }
    };

    useEffect(() => {
        if (!tab) {
            navigate("/settings/appearance", { replace: true });
        }
    }, [tab, navigate]);

    const handleExport = async () => {
        try {
            const filePath = await saveFileDialog({
                defaultPath: `jobdex-export-${new Date().toISOString().split("T")[0]}.json`,
                filters: [{ name: "JSON", extensions: ["json"] }],
            });
            if (!filePath) return;
            await invoke("export_all_data_to_path", { filePath });
            toast.success("Export saved.");
        } catch (error) {
            handleError(error, "Failed to export data");
        }
    };

    const handleClearDatabase = async () => {
        setClearDialogOpen(false);
        try {
            await invoke("clear_all_data");
            toast.success("Database cleared. Reloading...");
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            handleError(error, "Failed to clear database");
        }
    };

    const handleRestoreClick = async () => {
        try {
            const selected = await openFileDialog({
                multiple: false,
                filters: [{ name: "JobDex Backup", extensions: ["json"] }],
            });
            if (selected && typeof selected === "string") {
                setPendingImportPath(selected);
            }
        } catch (error) {
            handleError(error, "Failed to open file picker");
        }
    };

    const handleRestoreConfirm = async () => {
        if (!pendingImportPath) return;
        setImportLoading(true);
        try {
            const result = await invoke<ImportSummary>("import_all_data", { filePath: pendingImportPath });
            const parts = [
                `${result.contactsAdded} contacts added`,
                `${result.contactsUpdated} updated`,
            ];
            if (result.statusesAdded > 0) parts.push(`${result.statusesAdded} statuses added`);
            if (result.tagsAdded > 0) parts.push(`${result.tagsAdded} tags added`);
            if (result.eventsRestored > 0) parts.push(`${result.eventsRestored} events restored`);
            if (result.templatesRestored > 0) parts.push(`${result.templatesRestored} templates restored`);
            if (result.signaturesRestored > 0) parts.push(`${result.signaturesRestored} signatures restored`);
            if (result.scheduledRestored > 0) parts.push(`${result.scheduledRestored} scheduled emails restored`);
            toast.success(`Import complete — ${parts.join(", ")}.`);
        } catch (error) {
            handleError(error, "Import failed. The file may be invalid or corrupted.");
        } finally {
            setImportLoading(false);
            setPendingImportPath(null);
        }
    };

    const renderAppearanceContent = () => (
        <div className="space-y-6">
            <SettingSection title="Theme">
                <SettingRow label="Mode" description="Choose how JobDex looks.">
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                        {[
                            { id: "light", label: "Light", icon: Sun },
                            { id: "dark", label: "Dark", icon: Moon },
                            { id: "system", label: "System", icon: Monitor },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => updateSetting("theme_mode", t.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    (settings["theme_mode"] || "system") === t.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <t.icon className="h-3.5 w-3.5" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </SettingRow>
            </SettingSection>

            <SettingSection title="System">
                <SettingRow
                    label="Start on login"
                    description="Launch JobDex in the background when you start your computer. Scheduled emails will send even when the window is closed."
                >
                    <Button
                        variant={autostart ? "default" : "outline"}
                        size="sm"
                        onClick={handleAutostartToggle}
                    >
                        {autostart ? "Enabled" : "Disabled"}
                    </Button>
                </SettingRow>
            </SettingSection>
        </div>
    );

    const renderDataContent = () => (
        <div className="space-y-6">
            <SettingSection title="Backup">
                <SettingRow
                    label="Export data"
                    description="Download a full snapshot of your contacts, pipeline statuses, and settings as JSON."
                >
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        Generate export
                    </Button>
                </SettingRow>
                <SettingRow
                    label="Restore from backup"
                    description="Merge a previously exported backup file into your current data. Nothing is deleted."
                >
                    <Button variant="outline" size="sm" onClick={handleRestoreClick}>
                        Choose file…
                    </Button>
                </SettingRow>
            </SettingSection>

            <SettingSection title="Danger zone">
                <SettingRow
                    label="Factory reset"
                    description="Permanently delete all contacts, tags, statuses, email accounts, templates, and signatures. Settings and API keys are kept."
                    className="text-destructive [&_p]:text-muted-foreground"
                >
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive"
                        onClick={() => setClearDialogOpen(true)}
                    >
                        Clear all data
                    </Button>
                </SettingRow>
            </SettingSection>

            <p className="text-xs text-muted-foreground px-1">
                Your data is stored locally in an SQLite database. JobDex does not upload your contacts to any server.
            </p>

            <AlertDialog open={!!pendingImportPath} onOpenChange={(open) => { if (!open) setPendingImportPath(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restore from backup?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will merge the backup into your existing data. Nothing will be deleted. Any new contacts, statuses, and tags in the file will be added.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={importLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestoreConfirm} disabled={importLoading}>
                            {importLoading ? "Importing..." : "Restore"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete all contacts, statuses, tags, email accounts, templates, signatures, scheduled emails, and contact events. This action cannot be undone. Your app settings and API keys will remain untouched.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearDatabase}>
                            Clear All Data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case "email": return <EmailSettingsTab />;
            case "appearance": return renderAppearanceContent();
            case "pipeline": return <PipelineSettingsTab />;
            case "data": return renderDataContent();
            case "security": return <SecuritySettingsTab />;
            case "keyboard": return <KeyboardSettingsTab />;
            case "about": return <AboutTab />;
            case "api": return <ApiSettingsTab />;
            default: return renderAppearanceContent();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <PageHeader title="Settings" />
            <div className="flex flex-1 overflow-hidden">
                {/* Left nav */}
                <nav className="w-[160px] shrink-0 border-r px-2 py-4 overflow-y-auto">
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => navigate(`/settings/${item.id}`)}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                                    activeTab === item.id
                                        ? "bg-muted text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className={cn("px-8 py-6", activeTab !== "about" && "max-w-2xl")}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
