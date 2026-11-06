/**
 * Browser-development stand-in for `@tauri-apps/plugin-dialog`.
 *
 * Browsers cannot open or save arbitrary filesystem paths, and pretending a
 * cancelled dialog succeeded would corrupt caller state. Both entry points
 * reject with a descriptive error instead.
 */
const NATIVE_ONLY_MESSAGE =
    "File dialogs need the native JobDex app. Browser development mode has no filesystem access, so this action is unavailable here.";

export async function open(_options?: unknown): Promise<string | string[] | null> {
    throw new Error(NATIVE_ONLY_MESSAGE);
}

export async function save(_options?: unknown): Promise<string | null> {
    throw new Error(NATIVE_ONLY_MESSAGE);
}
