import { invokeBrowser } from "./store";

/**
 * Browser-development stand-in for `@tauri-apps/api/core`.
 *
 * Vite aliases the real module to this file only under `--mode browser`, so
 * production builds keep the native IPC bridge. Nothing here touches the
 * network, the filesystem or the OS keychain: every command is answered from
 * the synthetic fixture state in `./fixtures.ts`.
 */
function assertBrowserDevMode(): void {
    if (!import.meta.env.DEV || import.meta.env.MODE !== "browser") {
        throw new Error(
            "Browser fixture IPC is only available in browser development mode (vite --mode browser).",
        );
    }
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    assertBrowserDevMode();
    return invokeBrowser<T>(command, args);
}
