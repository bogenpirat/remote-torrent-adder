import { vi } from "vitest";

/**
 * Builds a fresh, fully-stubbed `chrome` namespace covering every API the
 * extension touches. Each call returns an independent object so tests never
 * leak listeners or stored state into one another.
 */
export function createChromeMock(): any {
    const storage: Record<string, any> = {};
    const sessionStorage: Record<string, any> = {};
    const storageListeners: ((changes: Record<string, any>, areaName: string) => void)[] = [];
    // Mirrors the ids Chrome is holding, so create() can reject duplicates the
    // way the real API does instead of silently succeeding.
    const contextMenuIds = new Set<string>();
    const rejectedMenuIds: string[] = [];

    const runtime = {
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
        sendMessage: vi.fn(() => Promise.resolve()),
        onInstalled: {
            addListener: vi.fn(),
        },
        onStartup: {
            addListener: vi.fn(),
        },
        lastError: undefined as { message: string } | undefined,
    };

    return {
        // backing store exposed for assertions/seeding in tests
        __storage: storage,
        __contextMenuIds: contextMenuIds,
        // ids Chrome refused because they were already registered
        __rejectedMenuIds: rejectedMenuIds,

        runtime,

        storage: {
            local: {
                // Chrome answers reads over IPC, so the callback never runs in
                // the caller's tick. Deferring here is what lets concurrent
                // readers interleave the way they do in the browser.
                get: vi.fn((keys: string[], cb: (items: Record<string, any>) => void) => {
                    const result: Record<string, any> = {};
                    for (const key of keys) {
                        if (key in storage) {
                            result[key] = storage[key];
                        }
                    }
                    queueMicrotask(() => cb(result));
                }),
                set: vi.fn((items: Record<string, any>, cb?: () => void) => {
                    const changes: Record<string, any> = {};
                    for (const [key, newValue] of Object.entries(items)) {
                        changes[key] = { oldValue: storage[key], newValue };
                    }
                    Object.assign(storage, items);
                    cb?.();
                    // Chrome dispatches change events out of band, after the
                    // write has already been acknowledged.
                    queueMicrotask(() => storageListeners.forEach(listener => listener(changes, "local")));
                }),
                onChanged: {
                    addListener: vi.fn((listener: (changes: Record<string, any>, areaName: string) => void) => {
                        storageListeners.push(listener);
                    }),
                    removeListener: vi.fn((listener: (changes: Record<string, any>, areaName: string) => void) => {
                        const index = storageListeners.indexOf(listener);
                        if (index >= 0) {
                            storageListeners.splice(index, 1);
                        }
                    }),
                },
            },
            session: {
                get: vi.fn((key: string) => {
                    const result: Record<string, any> = {};
                    if (key in sessionStorage) {
                        result[key] = sessionStorage[key];
                    }
                    return Promise.resolve(result);
                }),
                set: vi.fn((items: Record<string, any>) => {
                    Object.assign(sessionStorage, items);
                    return Promise.resolve();
                }),
            },
        },

        action: {
            onClicked: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            setBadgeText: vi.fn(() => Promise.resolve()),
            setPopup: vi.fn(),
            openPopup: vi.fn(() => Promise.resolve()),
        },

        notifications: {
            create: vi.fn((_id: string, _options: any, cb?: (id: string) => void) => cb?.("notif-id")),
            clear: vi.fn((_id: string, cb?: (wasCleared: boolean) => void) => {
                cb?.(true);
                return Promise.resolve(true);
            }),
            onClicked: {
                addListener: vi.fn(),
            },
        },

        offscreen: {
            hasDocument: vi.fn(() => Promise.resolve(false)),
            createDocument: vi.fn(() => Promise.resolve()),
        },

        tabs: {
            create: vi.fn(() => Promise.resolve()),
            query: vi.fn(() => Promise.resolve([])),
            sendMessage: vi.fn(() => Promise.resolve(undefined)),
        },

        windows: {
            getLastFocused: vi.fn(() => Promise.resolve({ id: 1 })),
            create: vi.fn(() => Promise.resolve()),
            update: vi.fn(() => Promise.resolve()),
        },

        contextMenus: {
            create: vi.fn((opts: any, cb?: () => void) => {
                const id = opts?.id;
                if (contextMenuIds.has(id)) {
                    rejectedMenuIds.push(id);
                    runtime.lastError = { message: `Cannot create item with duplicate id ${id}` };
                    cb?.();
                    runtime.lastError = undefined;
                    return id;
                }
                contextMenuIds.add(id);
                cb?.();
                return id;
            }),
            removeAll: vi.fn((cb?: () => void) => {
                contextMenuIds.clear();
                cb?.();
                return Promise.resolve();
            }),
            onClicked: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
        },

        webRequest: {
            onAuthRequired: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            onCompleted: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            onErrorOccurred: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
        },

        declarativeNetRequest: {
            getDynamicRules: vi.fn(() => Promise.resolve([])),
            getSessionRules: vi.fn(() => Promise.resolve([])),
            updateDynamicRules: vi.fn(() => Promise.resolve()),
            updateSessionRules: vi.fn(() => Promise.resolve()),
        },
    };
}
