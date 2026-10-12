import { test as base } from "@playwright/test";
import type firefox from "selenium-webdriver/firefox.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAssignedUuid, startFirefoxWithExtension } from "./firefox-browser";
import {
    HAS_BUFFERED_TORRENT,
    QUERY_PAGE_LINKS,
    READ_SESSION_RULES,
    READ_STORED_VALUE,
    WRITE_STORED_VALUE,
} from "./firefox-scripts";
import { openExtensionTab, openWebPage, type FirefoxTab } from "./firefox-tab";
import { StoredSettings } from "./stored-settings";
import { type PageLink } from "./worker-scripts";
import { SETTINGS_KEY } from "../../src/util/settings";

/**
 * Drives one Firefox profile with the extension installed as a temporary
 * add-on. The options page stays open for the whole test: it is the extension
 * context the harness evaluates its own scripts in.
 */
export class FirefoxExtensionHarness {
    driver!: firefox.Driver;
    uuid!: string;
    readonly settings = new StoredSettings({
        read: () => this.evaluate<string | undefined>(READ_STORED_VALUE, SETTINGS_KEY),
        write: serialized => this.evaluate<void>(WRITE_STORED_VALUE, SETTINGS_KEY, serialized),
    });
    private profileDir!: string;
    private optionsTab!: FirefoxTab;

    async launch(): Promise<void> {
        this.profileDir ??= await mkdtemp(join(tmpdir(), "rta-ff-e2e-"));
        this.driver = await startFirefoxWithExtension(this.profileDir);
        this.uuid = await readAssignedUuid(this.driver, this.profileDir);
        this.optionsTab = await openExtensionTab(this.driver, this.url("options/options.html"));
        await this.awaitSettledBoot();
    }

    private async awaitSettledBoot(): Promise<void> {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
            if (await this.settings.read()) {
                return;
            }
            await this.driver.sleep(100);
        }
        throw new Error("The event page never persisted its default settings");
    }

    async restart(): Promise<void> {
        await this.driver.quit();
        await this.launch();
    }

    async close(): Promise<void> {
        await this.driver.quit().catch(() => undefined);
        await rm(this.profileDir, { recursive: true, force: true }).catch(() => undefined);
    }

    url(path: string): string {
        return `moz-extension://${this.uuid}/${path.replace(/^\//, "")}`;
    }

    evaluate<R>(body: string, ...args: unknown[]): Promise<R> {
        return this.optionsTab.evaluate<R>(body, ...args);
    }

    openExtensionPage(url: string): Promise<FirefoxTab> {
        return openExtensionTab(this.driver, url);
    }

    openPage(url: string): Promise<FirefoxTab> {
        return openWebPage(this.driver, url);
    }

    sessionRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
        return this.evaluate(READ_SESSION_RULES);
    }

    pageLinks(tabUrlPattern: string): Promise<PageLink[]> {
        return this.evaluate(QUERY_PAGE_LINKS, tabUrlPattern);
    }

    hasBufferedTorrent(): Promise<boolean> {
        return this.evaluate<boolean>(HAS_BUFFERED_TORRENT);
    }
}

interface Fixtures {
    extension: FirefoxExtensionHarness;
}

export const test = base.extend<Fixtures>({
    extension: async ({}, use) => {
        const harness = new FirefoxExtensionHarness();
        await harness.launch();
        await use(harness);
        await harness.close();
    },
});

export { expect } from "@playwright/test";
