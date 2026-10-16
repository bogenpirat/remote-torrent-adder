import { test as base, chromium, type BrowserContext, type Page, type Worker } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsoleCollector } from "./console-collector";
import { EXTENSION_DIR } from "./paths";
import { StoredSettings } from "./stored-settings";
import { WorkerRecorder } from "./worker-recorder";
import { queryPageLinks, readSessionRules, readStoredValue, writeStoredValue, type PageLink } from "./worker-scripts";
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
    readonly recorder = new WorkerRecorder(() => this.worker);
    readonly settings = new StoredSettings({
        read: () => this.worker.evaluate(readStoredValue, SETTINGS_KEY),
        write: serialized => this.worker.evaluate(writeStoredValue, { key: SETTINGS_KEY, value: serialized }),
    });

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
            if (await this.settings.read()) {
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

    async evaluate<R>(workerFunction: () => R | Promise<R>): Promise<R> {
        return this.worker.evaluate(workerFunction);
    }

    pageLinks(tabUrlPattern: string): Promise<PageLink[]> {
        return this.worker.evaluate(queryPageLinks, tabUrlPattern);
    }

    sessionRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
        return this.worker.evaluate(readSessionRules);
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
