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

/**
 * Drives one real Firefox profile with the unpacked add-on installed.
 *
 * Firefox differs from Chrome in three ways this class exists to hide:
 *
 * 1. There is no service worker to evaluate in - the MV3 background is an event
 *    page that Selenium cannot address. Every extension API call is therefore
 *    routed through an extension page, which shares the same storage, the same
 *    declarativeNetRequest rules and the same messaging bus.
 * 2. The add-on gets a random per-profile UUID, so moz-extension:// origins
 *    cannot be hardcoded. It is read back out of the profile's prefs.js.
 * 3. Extension pages are not web accessible, so a content-initiated navigation
 *    to one is refused. The tab is opened from chrome context with the system
 *    principal instead, which is why geckodriver needs --allow-system-access.
 */
export class FirefoxExtensionHarness {
    driver!: firefox.Driver;
    uuid!: string;
    private profileDir!: string;
    private extensionHandle!: string;
    private pageHandle?: string;

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

    /**
     * Firefox writes the add-on's generated UUID into the profile's prefs.js
     * shortly after installing it. Seeding the pref up front does not work: on a
     * fresh profile Firefox rewrites the whole map as it registers its built-ins.
     */
    private async readAssignedUuid(): Promise<string> {
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            try {
                const prefs = await readFile(join(this.profileDir, "prefs.js"), "utf8");
                const match = /user_pref\("extensions\.webextensions\.uuids",\s*"(.*)"\);/.exec(prefs);
                const raw = match?.[1];
                if (raw) {
                    const uuids = JSON.parse(raw.replace(/\\"/g, '"')) as Record<string, string>;
                    const uuid = uuids[GECKO_ID];
                    if (uuid) {
                        return uuid;
                    }
                }
            } catch {
                // prefs.js has not been written yet.
            }
            await this.driver.sleep(200);
        }
        throw new Error(`Firefox never assigned a UUID to ${GECKO_ID}`);
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

    /** The event page writes its defaults during boot; hold until they land. */
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

    /**
     * Runs `body` inside the extension page, where the full browser.* API is
     * available. This is the Firefox counterpart of evaluating in Chrome's
     * service worker. `body` is a function body and reads its parameters from
     * the `args` array.
     */
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

    /** Opens a web page in its own tab and leaves it focused. */
    async openPage(url: string): Promise<string> {
        await this.driver.switchTo().newWindow("tab");
        await this.driver.get(url);
        this.pageHandle = await this.driver.getWindowHandle();
        return this.pageHandle;
    }

    /**
     * Clicks in the most recently opened web page. Reading extension state
     * switches the driver to the extension tab, so the focus has to be moved
     * back before the click lands.
     */
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

    /** Asks the content script in the matching tab which links it caught. */
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

    /** Rewrites settings with one field nudged so storage.onChanged actually fires. */
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
