import { test as base, chromium, type BrowserContext, type Page, type Worker } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsoleCollector } from "./console-collector";
import { EXTENSION_DIR } from "./paths";
import { type RTASettings } from "../../src/models/settings";
import { serializeSettings } from "../../src/util/serializer";
import { SETTINGS_KEY } from "../../src/util/settings";

/**
 * Drives one Chrome profile with the unpacked extension loaded.
 *
 * `restart()` closes the browser and reopens the same profile rather than
 * calling chrome.runtime.reload(): a reloaded extension has no pending event to
 * respond to, so Chrome leaves its service worker dormant. Reopening the profile
 * gives a genuine cold boot - onStartup included - with console listeners
 * already attached, so nothing the worker logs on the way up is missed.
 */
export class ExtensionHarness {
    context!: BrowserContext;
    worker!: Worker;
    id!: string;

    constructor(
        private readonly userDataDir: string,
        private readonly logs: ConsoleCollector,
    ) {}

    async launch(): Promise<void> {
        this.context = await chromium.launchPersistentContext(this.userDataDir, {
            channel: "chromium",
            args: [
                `--disable-extensions-except=${EXTENSION_DIR}`,
                `--load-extension=${EXTENSION_DIR}`,
            ],
        });
        this.logs.attach(this.context);
        this.worker = this.context.serviceWorkers()[0] ?? (await this.context.waitForEvent("serviceworker"));
        this.id = new URL(this.worker.url()).host;
        await this.awaitSettledBoot();
    }

    /**
     * On a fresh profile the worker writes its own defaults during boot. Seeding
     * before that write lands would silently lose the seed, so hold until
     * storage is populated and the worker has stopped talking.
     */
    private async awaitSettledBoot(): Promise<void> {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
            if (await this.readSettings()) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await this.logs.waitForQuiet({ quietMs: 400 });
    }

    async restart(): Promise<void> {
        await this.context.close();
        await this.launch();
    }

    async close(): Promise<void> {
        await this.context.close();
    }

    url(path: string): string {
        return `chrome-extension://${this.id}/${path.replace(/^\//, "")}`;
    }

    async openPage(url: string): Promise<Page> {
        const page = await this.context.newPage();
        await page.goto(url);
        return page;
    }

    async evaluate<R>(fn: () => R | Promise<R>): Promise<R> {
        return this.worker.evaluate(fn);
    }

    /**
     * Asks the content script in the given tab which links it caught, over the
     * extension's real messaging channel.
     */
    async pageLinks(tabUrlPattern: string): Promise<{ url: string; label: string }[]> {
        return this.worker.evaluate(async (pattern) => {
            const [tab] = await chrome.tabs.query({ url: pattern });
            if (!tab?.id) {
                throw new Error(`No tab matched ${pattern}`);
            }
            const response = (await chrome.tabs.sendMessage(
                tab.id,
                { action: "getPageLinks" },
                { frameId: 0 },
            )) as { links?: { url: string; label: string }[] } | undefined;
            return response?.links ?? [];
        }, tabUrlPattern);
    }

    async writeRawSettings(serialized: string): Promise<void> {
        await this.worker.evaluate(
            ([key, value]) => chrome.storage.local.set({ [key!]: value }),
            [SETTINGS_KEY, serialized],
        );
    }

    async seedSettings(settings: RTASettings): Promise<void> {
        await this.writeRawSettings(serializeSettings(settings));
    }

    async readSettings(): Promise<string | undefined> {
        return this.worker.evaluate(
            async (key) => (await chrome.storage.local.get([key]))[key] as string | undefined,
            SETTINGS_KEY,
        );
    }

    async sessionRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
        return this.worker.evaluate(() => chrome.declarativeNetRequest.getSessionRules());
    }

    /**
     * chrome.contextMenus has no read API, so the ids are observed by wrapping
     * create()/removeAll() and then provoking a rebuild.
     */
    async watchContextMenus(): Promise<void> {
        await this.worker.evaluate(() => {
            const scope = self as unknown as { __rtaE2eMenuIds?: string[] };
            if (scope.__rtaE2eMenuIds) {
                return;
            }
            scope.__rtaE2eMenuIds = [];
            const menus = chrome.contextMenus as unknown as {
                create: (...args: any[]) => unknown;
                removeAll: (...args: any[]) => unknown;
            };
            const create = menus.create.bind(menus);
            const removeAll = menus.removeAll.bind(menus);
            menus.create = (properties: { id?: string }, ...rest: any[]) => {
                scope.__rtaE2eMenuIds!.push(String(properties.id));
                return create(properties, ...rest);
            };
            menus.removeAll = (...args: any[]) => {
                scope.__rtaE2eMenuIds!.length = 0;
                return removeAll(...args);
            };
        });
    }

    /**
     * Rewrites the stored settings with one field nudged, so Chrome actually
     * fires storage.onChanged - an identical value is a no-op event-wise - and
     * the worker rebuilds the menu and the CORS rules.
     */
    async provokeSettingsChange(): Promise<void> {
        const stored = await this.readSettings();
        const settings = JSON.parse(stored ?? "{}") as { notificationsDurationMs?: number };
        settings.notificationsDurationMs = (settings.notificationsDurationMs ?? 2000) + 1;
        await this.writeRawSettings(JSON.stringify(settings));
    }

    async contextMenuIds(): Promise<string[]> {
        return this.worker.evaluate(
            () => (self as unknown as { __rtaE2eMenuIds?: string[] }).__rtaE2eMenuIds ?? [],
        );
    }

    /** Records every notification the worker raises from this point on. */
    async watchNotifications(): Promise<void> {
        await this.worker.evaluate(() => {
            const scope = self as unknown as { __rtaE2eNotifications?: unknown[] };
            if (scope.__rtaE2eNotifications) {
                return;
            }
            scope.__rtaE2eNotifications = [];
            const notifications = chrome.notifications as unknown as { create: (...args: any[]) => unknown };
            const create = notifications.create.bind(notifications);
            notifications.create = (...args: any[]) => {
                scope.__rtaE2eNotifications!.push(args.find(arg => typeof arg === "object" && arg !== null));
                return create(...args);
            };
        });
    }

    async notifications(): Promise<{ title?: string; message?: string }[]> {
        return this.worker.evaluate(
            () =>
                ((self as unknown as { __rtaE2eNotifications?: unknown[] }).__rtaE2eNotifications ?? []) as {
                    title?: string;
                    message?: string;
                }[],
        );
    }
}

interface Fixtures {
    logs: ConsoleCollector;
    extension: ExtensionHarness;
}

export const test = base.extend<Fixtures>({
    logs: async ({}, use) => {
        await use(new ConsoleCollector());
    },

    extension: async ({ logs }, use) => {
        const userDataDir = await mkdtemp(join(tmpdir(), "rta-e2e-"));
        const harness = new ExtensionHarness(userDataDir, logs);
        await harness.launch();

        await use(harness);

        await harness.close();
        await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    },
});

export { expect } from "@playwright/test";
