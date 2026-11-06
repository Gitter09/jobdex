/**
 * Browser-development stand-in for `@tauri-apps/api/app`.
 * Only `getVersion` is imported by the app today.
 */
export async function getVersion(): Promise<string> {
    return "0.2.1-browser";
}
