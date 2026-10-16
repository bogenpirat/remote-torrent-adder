/**
 * Functions Playwright serialises and runs inside the extension's service
 * worker. Each one has to be self-contained: nothing from this module's scope
 * exists where it executes.
 */

export interface PageLink {
    url: string;
    label: string;
}

export interface RaisedNotification {
    title?: string;
    message?: string;
}

export interface StoredEntry {
    key: string;
    value: string;
}

export async function readStoredValue(key: string): Promise<string | undefined> {
    return (await chrome.storage.local.get([key]))[key] as string | undefined;
}

export function writeStoredValue({ key, value }: StoredEntry): Promise<void> {
    return chrome.storage.local.set({ [key]: value });
}

export function readSessionRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
    return chrome.declarativeNetRequest.getSessionRules();
}

/** Asks the content script in the matching tab which links it caught, over the extension's real messaging channel. */
export async function queryPageLinks(tabUrlPattern: string): Promise<PageLink[]> {
    const [tab] = await chrome.tabs.query({ url: tabUrlPattern });
    if (!tab?.id) {
        throw new Error(`No tab matched ${tabUrlPattern}`);
    }
    const response = (await chrome.tabs.sendMessage(tab.id, { action: "getPageLinks" }, { frameId: 0 })) as
        | { links?: PageLink[] }
        | undefined;
    return response?.links ?? [];
}

/**
 * chrome.contextMenus has no read API, so the ids are observed by wrapping
 * create()/removeAll().
 */
export function recordContextMenuIds(): void {
    const scope = self as unknown as { __rtaE2eMenuIds?: string[] };
    if (scope.__rtaE2eMenuIds) {
        return;
    }
    const menuIds: string[] = (scope.__rtaE2eMenuIds = []);
    const menus = chrome.contextMenus as unknown as Record<"create" | "removeAll", (...args: any[]) => unknown>;
    const create = menus.create.bind(menus);
    const removeAll = menus.removeAll.bind(menus);
    menus.create = (properties: { id?: string }, ...rest: any[]) => {
        menuIds.push(String(properties.id));
        return create(properties, ...rest);
    };
    menus.removeAll = (...args: any[]) => {
        menuIds.length = 0;
        return removeAll(...args);
    };
}

export function readContextMenuIds(): string[] {
    return (self as unknown as { __rtaE2eMenuIds?: string[] }).__rtaE2eMenuIds ?? [];
}

export function recordNotifications(): void {
    const scope = self as unknown as { __rtaE2eNotifications?: unknown[] };
    if (scope.__rtaE2eNotifications) {
        return;
    }
    const raised: unknown[] = (scope.__rtaE2eNotifications = []);
    const notifications = chrome.notifications as unknown as { create: (...args: any[]) => unknown };
    const create = notifications.create.bind(notifications);
    notifications.create = (...args: any[]) => {
        raised.push(args.find(arg => typeof arg === "object" && arg !== null));
        return create(...args);
    };
}

export function readNotifications(): RaisedNotification[] {
    const scope = self as unknown as { __rtaE2eNotifications?: RaisedNotification[] };
    return scope.__rtaE2eNotifications ?? [];
}
