/**
 * In-memory stand-in for `@tauri-apps/api/event` in browser development mode.
 * Listeners live for the page session only; no native or network access.
 */
export interface BrowserEvent<T> {
    event: string;
    id: number;
    payload: T;
}

type Listener = (event: BrowserEvent<unknown>) => void;

const listeners = new Map<string, Set<Listener>>();
let nextEventId = 1;

export async function listen<T>(
    event: string,
    handler: (event: BrowserEvent<T>) => void,
): Promise<() => void> {
    const listener = handler as Listener;
    let set = listeners.get(event);
    if (!set) {
        set = new Set();
        listeners.set(event, set);
    }
    set.add(listener);

    return () => {
        const current = listeners.get(event);
        if (!current) return;
        current.delete(listener);
        if (current.size === 0) listeners.delete(event);
    };
}

export function emitBrowserEvent(event: string, payload: unknown): void {
    const set = listeners.get(event);
    if (!set) return;
    const envelope: BrowserEvent<unknown> = { event, id: nextEventId++, payload };
    for (const listener of [...set]) {
        try {
            listener(envelope);
        } catch (error) {
            // A broken subscriber must not abort the mutation that emitted the event.
            console.error(`[browser-dev] listener for "${event}" failed`, error);
        }
    }
}
