import { test as base } from "@playwright/test";
import { Builder, By } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIREFOX_EXTENSION_DIR, GECKO_ID } from "./firefox-paths";
import { type RTASettings } from "../../src/models/settings";
import { serializeSettings } from "../../src/util/serializer";
import { SETTINGS_KEY } from "../../src/util/settings";

const HEADLESS = process.env.RTA_FIREFOX_HEADED !== "1";

export class FirefoxExtensionHarness {
    driver!: firefox.Driver;
    uuid!: string;
    private profileDir!: string;
    private extensionHandle!: string;
    private pageHandle?: string;
    private activeHandle?: string;

    async launch(): Promise<void> {
        this.profileDir ??= await mkdtemp(join(tmpdir(), "rta-ff-e2e-"));

        const options = new firefox.Options();
        options.addArguments("--profile", this.profileDir);
        if (HEADLESS) {
            options.addArguments("--headless");
        }
        options.setPreference("xpinstall.signatures.required", false);

        this.driver = (await new Builder()
            .forBrowser("firefox")
            .setFirefoxOptions(options)
            .setFirefoxService(new firefox.ServiceBuilder().addArguments("--allow-system-access"))
            .build()) as firefox.Driver;

        await this.driver.installAddon(FIREFOX_EXTENSION_DIR, true);
        this.uuid = await this.readAssignedUuid();
        this.extensionHandle = await this.openExtensionTab(this.url("options/options.html"));
        await this.awaitSettledBoot();
    }

    private async readAssignedUuid(): Promise<string> {
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            const uuid = await this.readUuidFromPrefs();
            if (uuid) {
                return uuid;
            }
            await this.driver.sleep(200);
        }
        throw new Error(`Firefox never assigned a UUID to ${GECKO_ID}`);
    }

    private async readUuidFromPrefs(): Promise<string | null> {
        let prefs: string;
        try {
            prefs = await readFile(join(this.profileDir, "prefs.js"), "utf8");
        } catch {
            return null;
        }
        const raw = /user_pref\("extensions\.webextensions\.uuids",\s*"(.*)"\);/.exec(prefs)?.[1];
        if (!raw) {
            return null;
        }
        const uuids = JSON.parse(raw.replace(/\\"/g, '"')) as Record<string, string>;
        return uuids[GECKO_ID] ?? null;
    }

    private async openExtensionTab(url: string): Promise<string> {
        const before = await this.driver.getAllWindowHandles();
        await this.driver.setContext(firefox.Context.CHROME);
        await this.driver.executeScript(
            [
                'const browserWindow = Services.wm.getMostRecentWindow("navigator:browser");',
                "browserWindow.gBrowser.selectedTab = browserWindow.gBrowser.addTab(arguments[0], {",
                "    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),",
                "});",
            ].join("\n"),
            url,
        );
        await this.driver.setContext(firefox.Context.CONTENT);

        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
            const handles = await this.driver.getAllWindowHandles();
            const fresh = handles.find(handle => !before.includes(handle));
            if (fresh) {
                await this.driver.switchTo().window(fresh);
                if ((await this.driver.getCurrentUrl()).startsWith(url)) {
                    return fresh;
                }
            }
            await this.driver.sleep(100);
        }
        throw new Error(`Extension page never opened: ${url}`);
    }

    private async awaitSettledBoot(): Promise<void> {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
            if (await this.readSettings()) {
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

    async evaluate<R>(body: string, ...args: unknown[]): Promise<R> {
        await this.driver.switchTo().window(this.extensionHandle);
        const outcome = await this.driver.executeAsyncScript<{ value?: R; error?: string }>(
            [
                "const done = arguments[arguments.length - 1];",
                "const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);",
                "(async () => {",
                body,
                "})().then(",
                "    value => done({ value }),",
                "    error => done({ error: String((error && error.message) || error) }),",
                ");",
            ].join("\n"),
            ...args,
        );
        if (outcome.error !== undefined) {
            throw new Error(`Extension page evaluate failed: ${outcome.error}`);
        }
        return outcome.value as R;
    }

    async openExtensionPage(url: string): Promise<string> {
        this.activeHandle = await this.openExtensionTab(url);
        return this.activeHandle;
    }

    async evaluateHere<R>(body: string, ...args: unknown[]): Promise<R> {
        if (!this.activeHandle) {
            throw new Error("evaluateHere needs a page opened by openExtensionPage first");
        }
        await this.driver.switchTo().window(this.activeHandle);
        const outcome = await this.driver.executeAsyncScript<{ value?: R; error?: string }>(
            [
                "const done = arguments[arguments.length - 1];",
                "const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);",
                "(async () => {",
                body,
                "})().then(",
                "    value => done({ value }),",
                "    error => done({ error: String((error && error.message) || error) }),",
                ");",
            ].join("\n"),
            ...args,
        );
        if (outcome.error !== undefined) {
            throw new Error(`Extension page evaluate failed: ${outcome.error}`);
        }
        return outcome.value as R;
    }

    async clickHereByText(text: string): Promise<void> {
        if (!this.activeHandle) {
            throw new Error("clickHereByText needs a page opened by openExtensionPage first");
        }
        await this.driver.switchTo().window(this.activeHandle);
        await this.driver.findElement(By.xpath(`//button[normalize-space(.)=${JSON.stringify(text)}]`)).click();
    }

    async openPage(url: string): Promise<string> {
        await this.driver.switchTo().newWindow("tab");
        await this.driver.get(url);
        this.pageHandle = await this.driver.getWindowHandle();
        return this.pageHandle;
    }

    async clickInPage(selector: string): Promise<void> {
        if (!this.pageHandle) {
            throw new Error("clickInPage needs a page opened by openPage first");
        }
        await this.driver.switchTo().window(this.pageHandle);
        await this.driver.findElement(By.css(selector)).click();
    }

    async writeRawSettings(serialized: string): Promise<void> {
        await this.evaluate(
            "await browser.storage.local.set({ [args[0]]: args[1] });",
            SETTINGS_KEY,
            serialized,
        );
    }

    async seedSettings(settings: RTASettings): Promise<void> {
        await this.writeRawSettings(serializeSettings(settings));
    }

    async readSettings(): Promise<string | undefined> {
        return this.evaluate<string | undefined>(
            "return (await browser.storage.local.get([args[0]]))[args[0]];",
            SETTINGS_KEY,
        );
    }

    async sessionRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
        return this.evaluate("return await browser.declarativeNetRequest.getSessionRules();");
    }

    async pageLinks(tabUrlPattern: string): Promise<{ url: string; label: string }[]> {
        return this.evaluate(
            [
                "const [tab] = await browser.tabs.query({ url: args[0] });",
                'if (!tab || !tab.id) { throw new Error("No tab matched " + args[0]); }',
                'const response = await browser.tabs.sendMessage(tab.id, { action: "getPageLinks" }, { frameId: 0 });',
                "return (response && response.links) || [];",
            ].join("\n"),
            tabUrlPattern,
        );
    }

    async hasBufferedTorrent(): Promise<boolean> {
        return this.evaluate<boolean>(
            [
                "const record = await new Promise((res, rej) => {",
                '  const open = indexedDB.open("rta-torrents", 1);',
                "  open.onerror = () => rej(open.error);",
                "  open.onsuccess = () => {",
                '    const tx = open.result.transaction("buffered", "readonly");',
                '    const get = tx.objectStore("buffered").get("pending");',
                "    get.onsuccess = () => res(get.result); get.onerror = () => rej(get.error);",
                "    tx.oncomplete = () => open.result.close();",
                "  };",
                "});",
                "return Boolean(record && record.torrent);",
            ].join("\n"),
        );
    }

    async provokeSettingsChange(): Promise<void> {
        const stored = await this.readSettings();
        const settings = JSON.parse(stored ?? "{}") as { notificationsDurationMs?: number };
        settings.notificationsDurationMs = (settings.notificationsDurationMs ?? 2000) + 1;
        await this.writeRawSettings(JSON.stringify(settings));
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
