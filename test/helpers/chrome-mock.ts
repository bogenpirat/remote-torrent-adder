import { vi } from "vitest";

type StoredItems = Record<string, any>;
type StorageListener = (changes: StoredItems, areaName: string) => void;
type RuntimeMock = ReturnType<typeof createRuntimeMock>;

const EXTENSION_ORIGIN = "chrome-extension://rta-test-id";

/** The URL the mocked `runtime.getURL` returns for a packaged file. */
export function extensionUrl(path: string): string {
    return `${EXTENSION_ORIGIN}/${path.replace(/^\//, "")}`;
}

/**
 * Builds a fresh, fully-stubbed `chrome` namespace covering every API the
 * extension touches. Each call returns an independent object so tests never
 * leak listeners or stored state into one another.
 */
export function createChromeMock(): any {
    const storage: StoredItems = {};
    // Mirrors the ids Chrome is holding, so create() can reject duplicates the
    // way the real API does instead of silently succeeding.
    const contextMenuIds = new Set<string>();
    const rejectedMenuIds: string[] = [];
    const runtime = createRuntimeMock();

    return {
        // backing store exposed for assertions/seeding in tests
        __storage: storage,
        __contextMenuIds: contextMenuIds,
        // ids Chrome refused because they were already registered
        __rejectedMenuIds: rejectedMenuIds,
        runtime,
        storage: { local: createLocalStorageMock(storage), session: createSessionStorageMock() },
        contextMenus: createContextMenusMock(runtime, { contextMenuIds, rejectedMenuIds }),
        ...createStatelessApiMocks(),
    };
}

function createRuntimeMock() {
    return {
        onMessage: createEventMock(),
        sendMessage: vi.fn(() => Promise.resolve()),
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() },
        lastError: undefined as { message: string } | undefined,
        getURL: vi.fn(extensionUrl),
    };
}

function createEventMock() {
    return { addListener: vi.fn(), removeListener: vi.fn() };
}

function createLocalStorageMock(storage: StoredItems) {
    const listeners: StorageListener[] = [];
    return {
        get: vi.fn((keys: string[], callback?: (items: StoredItems) => void) => readDeferred(storage, keys, callback)),
        set: vi.fn((items: StoredItems, callback?: () => void) => {
            const changes = describeChanges(storage, items);
            Object.assign(storage, items);
            callback?.();
            // Chrome dispatches change events out of band, after the
            // write has already been acknowledged.
            queueMicrotask(() => listeners.forEach(listener => listener(changes, "local")));
            return Promise.resolve();
        }),
        onChanged: createStorageEventMock(listeners),
    };
}

// The browser answers reads over IPC, so the promise never settles in the
// caller's tick. Deferring here is what lets concurrent readers interleave the
// way they do in the browser.
function readDeferred(storage: StoredItems, keys: string[], callback?: (items: StoredItems) => void): Promise<StoredItems> {
    const result = pickStored(storage, keys);
    return new Promise<StoredItems>(resolve => {
        queueMicrotask(() => {
            callback?.(result);
            resolve(result);
        });
    });
}

function pickStored(storage: StoredItems, keys: string[]): StoredItems {
    return Object.fromEntries(keys.filter(key => key in storage).map(key => [key, storage[key]]));
}

function describeChanges(storage: StoredItems, items: StoredItems): StoredItems {
    return Object.fromEntries(Object.entries(items).map(([key, newValue]) => [key, { oldValue: storage[key], newValue }]));
}

function createStorageEventMock(listeners: StorageListener[]) {
    return {
        addListener: vi.fn((listener: StorageListener) => {
            listeners.push(listener);
        }),
        removeListener: vi.fn((listener: StorageListener) => {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }),
    };
}

function createSessionStorageMock() {
    const sessionStorage: StoredItems = {};
    return {
        get: vi.fn((key: string) => Promise.resolve(pickStored(sessionStorage, [key]))),
        set: vi.fn((items: StoredItems) => {
            Object.assign(sessionStorage, items);
            return Promise.resolve();
        }),
    };
}

interface ContextMenuRegistry {
    contextMenuIds: Set<string>;
    rejectedMenuIds: string[];
}

function createContextMenusMock(runtime: RuntimeMock, registry: ContextMenuRegistry) {
    return {
        create: vi.fn((opts: any, callback?: () => void) => {
            const id = opts?.id;
            if (registry.contextMenuIds.has(id)) {
                registry.rejectedMenuIds.push(id);
                runtime.lastError = { message: `Cannot create item with duplicate id ${id}` };
            }
            registry.contextMenuIds.add(id);
            callback?.();
            runtime.lastError = undefined;
            return id;
        }),
        removeAll: vi.fn((callback?: () => void) => {
            registry.contextMenuIds.clear();
            callback?.();
            return Promise.resolve();
        }),
        onClicked: createEventMock(),
    };
}

function createStatelessApiMocks() {
    return {
        action: createActionMock(),
        notifications: createNotificationsMock(),
        permissions: createPermissionsMock(),
        offscreen: { hasDocument: vi.fn(() => Promise.resolve(false)), createDocument: vi.fn(() => Promise.resolve()) },
        tabs: createTabsMock(),
        windows: createWindowsMock(),
        webRequest: { onAuthRequired: createEventMock(), onCompleted: createEventMock(), onErrorOccurred: createEventMock() },
        declarativeNetRequest: createDeclarativeNetRequestMock(),
    };
}

function createActionMock() {
    return {
        onClicked: createEventMock(),
        setBadgeText: vi.fn(() => Promise.resolve()),
        setPopup: vi.fn(),
        openPopup: vi.fn(() => Promise.resolve()),
    };
}

function createNotificationsMock() {
    return {
        create: vi.fn((_notificationId: string, _options: any, callback?: (id: string) => void) => {
            callback?.("notif-id");
            return Promise.resolve("notif-id");
        }),
        clear: vi.fn((_notificationId: string) => Promise.resolve(true)),
        onClicked: { addListener: vi.fn() },
    };
}

function createPermissionsMock() {
    return {
        contains: vi.fn(() => Promise.resolve(true)),
        request: vi.fn(() => Promise.resolve(true)),
        onAdded: createEventMock(),
        onRemoved: createEventMock(),
    };
}

function createTabsMock() {
    return {
        create: vi.fn(() => Promise.resolve()),
        query: vi.fn(() => Promise.resolve([])),
        sendMessage: vi.fn(() => Promise.resolve(undefined)),
    };
}

function createWindowsMock() {
    return {
        getLastFocused: vi.fn(() => Promise.resolve({ id: 1 })),
        create: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
    };
}

function createDeclarativeNetRequestMock() {
    return {
        getDynamicRules: vi.fn(() => Promise.resolve([])),
        getSessionRules: vi.fn(() => Promise.resolve([])),
        updateDynamicRules: vi.fn(() => Promise.resolve()),
        updateSessionRules: vi.fn(() => Promise.resolve()),
    };
}
