import { vi } from "vitest";

/**
 * Builds a fresh, fully-stubbed `chrome` namespace covering every API the
 * extension touches. Each call returns an independent object so tests never
 * leak listeners or stored state into one another.
 */
export function createChromeMock(): any {
    const storage: Record<string, any> = {};

    return {
        // backing store exposed for assertions/seeding in tests
        __storage: storage,

        runtime: {
            onMessage: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            sendMessage: vi.fn(() => Promise.resolve()),
            lastError: undefined,
        },

        storage: {
            local: {
                get: vi.fn((keys: string[], cb: (items: Record<string, any>) => void) => {
                    const result: Record<string, any> = {};
                    for (const key of keys) {
                        if (key in storage) {
                            result[key] = storage[key];
                        }
                    }
                    cb(result);
                }),
                set: vi.fn((items: Record<string, any>, cb?: () => void) => {
                    Object.assign(storage, items);
                    cb?.();
                }),
            },
        },

        action: {
            onClicked: {
                addListener: vi.fn(),
                removeListener: vi.fn(),
            },
            setBadgeText: vi.fn(),
            setPopup: vi.fn(),
            openPopup: vi.fn(() => Promise.resolve()),
        },

        notifications: {
            create: vi.fn((id: string, options: any, cb?: (id: string) => void) => cb?.("notif-id")),
            clear: vi.fn((id: string, cb?: (wasCleared: boolean) => void) => cb?.(true)),
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
        },

        windows: {
            getLastFocused: vi.fn(() => Promise.resolve({ id: 1 })),
            create: vi.fn(() => Promise.resolve()),
            update: vi.fn(() => Promise.resolve()),
        },

        contextMenus: {
            create: vi.fn((opts: any) => opts?.id),
            removeAll: vi.fn(),
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
