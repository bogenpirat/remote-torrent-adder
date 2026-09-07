import { test, expect } from "../fixtures/firefox-extension";
import { StaticSite } from "../fixtures/static-site";
import { makeSettings, makeWebUISettings } from "../fixtures/settings";

test.describe("firefox event page", () => {
    test("boots on a fresh profile and persists default settings", async ({ extension }) => {
        const stored = await extension.readSettings();

        expect(stored).toBeTruthy();
        const settings = JSON.parse(stored!) as { linkCatchingEnabled: boolean; webuiSettings: unknown[] };
        expect(settings.linkCatchingEnabled).toBe(true);
        expect(settings.webuiSettings).toEqual([]);
    });

    test("runs as a background script, not a service worker", async ({ extension }) => {
        const background = await extension.evaluate<{ hasServiceWorker: boolean; scripts: string[] }>(
            [
                "const manifest = browser.runtime.getManifest();",
                "return {",
                "    hasServiceWorker: Boolean(manifest.background && manifest.background.service_worker),",
                "    scripts: (manifest.background && manifest.background.scripts) || [],",
                "};",
            ].join("\n"),
        );

        expect(background.hasServiceWorker).toBe(false);
        // Firefox resolves manifest paths to absolute moz-extension:// URLs.
        expect(background.scripts).toHaveLength(1);
        expect(background.scripts[0]).toMatch(/\/service_worker\.js$/);
    });

    test("has no offscreen API and does not need one", async ({ extension }) => {
        const hasOffscreen = await extension.evaluate<boolean>(
            'return typeof browser.offscreen !== "undefined";',
        );

        expect(hasOffscreen).toBe(false);
    });

    test("registers one CORS session rule per configured WebUI", async ({ extension }) => {
        await extension.seedSettings(
            makeSettings([
                makeWebUISettings({ id: "a", name: "Alpha", host: "alpha.invalid", port: 8080 }),
                makeWebUISettings({ id: "b", name: "Beta", host: "beta.invalid", port: 9090 }),
            ]),
        );

        await expect
            .poll(async () => (await extension.sessionRules()).length, { timeout: 15_000 })
            .toBe(2);

        const rules = await extension.sessionRules();
        const stripped = rules.map(rule => rule.action.requestHeaders?.[0]);
        expect(stripped.every(header => header?.header === "origin" && header.operation === "remove")).toBe(true);
        expect(rules.map(rule => rule.condition.urlFilter).sort()).toEqual([
            "|http://alpha.invalid:8080*",
            "|http://beta.invalid:9090*",
        ]);
    });

    test("re-asserts the CORS rules after a browser restart", async ({ extension }) => {
        await extension.seedSettings(
            makeSettings([makeWebUISettings({ id: "a", name: "Alpha", host: "alpha.invalid", port: 8080 })]),
        );
        await expect.poll(async () => (await extension.sessionRules()).length, { timeout: 15_000 }).toBe(1);

        await extension.restart();

        await expect.poll(async () => (await extension.sessionRules()).length, { timeout: 15_000 }).toBe(1);
    });

    test("recovers from corrupt stored settings", async ({ extension }) => {
        await extension.writeRawSettings("this is not json");
        await extension.restart();

        const stored = await extension.readSettings();
        expect(() => JSON.parse(stored!)).not.toThrow();
    });
});

test.describe("firefox content script", () => {
    // Match patterns cannot carry a port, and Firefox rejects one where Chrome
    // tolerates it. The port is irrelevant: the pattern matches any.
    const SITE_PATTERN = "http://127.0.0.1/*";
    let site: StaticSite;

    test.beforeEach(async () => {
        site = new StaticSite();
        await site.start();
    });

    test.afterEach(async () => {
        await site.stop();
    });

    test("catches torrent and magnet links on a real page", async ({ extension }) => {
        await extension.openPage(site.baseUrl);

        await expect
            .poll(async () => (await extension.pageLinks(SITE_PATTERN)).length, { timeout: 15_000 })
            .toBe(2);

        const links = await extension.pageLinks(SITE_PATTERN);
        const urls = links.map(link => link.url).sort();
        expect(urls[0]).toContain("/files/sample.torrent");
        expect(urls[1]).toMatch(/^magnet:/);
    });

    test("catches nothing when link catching is turned off", async ({ extension }) => {
        await extension.seedSettings(makeSettings([], { linkCatchingEnabled: false }));
        await extension.openPage(site.baseUrl);

        await extension.driver.sleep(2000);

        expect(await extension.pageLinks(SITE_PATTERN)).toEqual([]);
    });
});

test.describe("firefox options page", () => {
    test("renders every tab", async ({ extension }) => {
        const tabs = await extension.evaluate<string[]>(
            'return Array.from(document.querySelectorAll("[role=tab]")).map(element => element.textContent);',
        );

        expect(tabs).toEqual([
            "WebUIs",
            "Icon Click",
            "Notifications",
            "Link Catching",
            "Import/Export Settings",
            "About",
        ]);
    });

    test("does not warn about host permissions when they are granted", async ({ extension }) => {
        const granted = await extension.evaluate<boolean>(
            'return await browser.permissions.contains({ origins: ["<all_urls>"] });',
        );

        expect(granted).toBe(true);
        const alerts = await extension.evaluate<number>(
            'return document.querySelectorAll("[role=alert]").length;',
        );
        expect(alerts).toBe(0);
    });
});
