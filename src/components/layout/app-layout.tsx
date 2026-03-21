import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";
import { ImportDialog } from "@/components/import/import-dialog";
import { WhatsNewModal } from "@/components/whats-new-modal";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

function isNewerVersion(remote: string, current: string): boolean {
    const parse = (v: string) => v.split(".").map(Number);
    const [rM, rm, rp] = parse(remote);
    const [cM, cm, cp] = parse(current);
    if (rM !== cM) return rM > cM;
    if (rm !== cm) return rm > cm;
    return rp > cp;
}

export function AppLayout() {
    const [commandOpen, setCommandOpen] = useState(false);
    const [addContactOpen, setAddContactOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [newContactStatusId, setNewContactStatusId] = useState<string | undefined>(undefined);
    const [whatsNewOpen, setWhatsNewOpen] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
    const [updateDismissed, setUpdateDismissed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isSettings = location.pathname.startsWith("/settings");

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                if (isSettings) return;
                e.preventDefault();
                setCommandOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [isSettings]);

    useEffect(() => {
        async function checkVersions() {
            try {
                const currentVersion = await getVersion();

                // What's New modal: show if this version hasn't been seen yet
                const settings = await invoke<Record<string, string>>("get_settings");
                const lastSeen = settings["last_seen_version"];
                if (!lastSeen || lastSeen !== currentVersion) {
                    setWhatsNewOpen(true);
                }

                // Update check: ask Rust to fetch the latest GitHub release tag
                const latestTag = await invoke<string>("check_for_update");
                if (latestTag && isNewerVersion(latestTag, currentVersion)) {
                    setUpdateAvailable(latestTag);
                }
            } catch {
                // Silently ignore — update check is best-effort
            }
        }
        checkVersions();
    }, []);

    const handleWhatsNewClose = async (open: boolean) => {
        setWhatsNewOpen(open);
        if (!open) {
            try {
                const v = await getVersion();
                await invoke("save_setting", { key: "last_seen_version", value: v });
            } catch {
                // ignore
            }
        }
    };

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background font-sans antialiased text-foreground">
            {updateAvailable && !updateDismissed && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground text-sm flex items-center justify-between px-4 py-2">
                    <span>v{updateAvailable} is out — a few things got better.</span>
                    <div className="flex items-center gap-4">
                        <button
                            className="underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
                            onClick={() => invoke("open_external_url", { url: "https://github.com/Gitter09/outreach-os/releases/latest" })}
                        >
                            Get it
                        </button>
                        <button
                            className="opacity-70 hover:opacity-100 transition-opacity"
                            onClick={() => setUpdateDismissed(true)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            <AppSidebar />
            <main className="flex-1 overflow-y-auto relative">
                <Outlet context={{
                    commandOpen,
                    setCommandOpen,
                    addContactOpen,
                    setAddContactOpen,
                    importOpen,
                    setImportOpen,
                    refreshTrigger,
                    handleRefresh,
                    setNewContactStatusId,
                }} />
            </main>

            {/* Global Dialogs */}
            <CommandPalette
                open={commandOpen}
                onOpenChange={setCommandOpen}
                onContactsChanged={handleRefresh}
                onOpenImport={() => setImportOpen(true)}
                onOpenAddContact={() => setAddContactOpen(true)}
                onSelectContact={(id) => navigate(`/people/${id}`)}
                onOpenSettings={() => navigate("/settings")}
            />
            <AddContactDialog
                open={addContactOpen}
                onOpenChange={(open) => {
                    setAddContactOpen(open);
                    if (!open) setNewContactStatusId(undefined);
                }}
                onContactAdded={handleRefresh}
                initialStatusId={newContactStatusId}
            />
            <ImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                onImportComplete={handleRefresh}
            />
            <WhatsNewModal open={whatsNewOpen} onOpenChange={handleWhatsNewClose} />
        </div>
    );
}
