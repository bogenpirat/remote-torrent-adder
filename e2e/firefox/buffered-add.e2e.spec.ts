import { test, expect, type FirefoxExtensionHarness } from "../fixtures/firefox-extension";
import { FakeFlood } from "../fixtures/fake-flood";
import { type FirefoxTab } from "../fixtures/firefox-tab";
import { StaticSite } from "../fixtures/static-site";
import { makeFakeClientSettings } from "../fixtures/settings";
import { Client } from "../../src/models/clients";

const SITE_PATTERN = "http://127.0.0.1/*";

test.describe("adding through the label/dir popup", () => {
    let site: StaticSite;
    let client: FakeFlood;

    test.beforeEach(async () => {
        site = new StaticSite();
        client = new FakeFlood({ authenticateDelayMs: 3000 });
        await site.start();
        await client.start();
    });

    test.afterEach(async () => {
        await site.stop();
        await client.stop();
    });

    async function bufferCaughtTorrent(extension: FirefoxExtensionHarness): Promise<void> {
        const page = await extension.openPage(`${site.baseUrl}/`);
        await expect.poll(async () => (await extension.pageLinks(SITE_PATTERN)).length).toBeGreaterThan(0);
        await page.click("#torrent-link");
        await expect.poll(() => extension.hasBufferedTorrent(), { timeout: 20_000 }).toBe(true);
    }

    async function openAddPopup(extension: FirefoxExtensionHarness): Promise<FirefoxTab> {
        const popup = await extension.openExtensionPage(extension.url("popup/popup.html"));
        await expect
            .poll(() => popup.evaluate<string>("return document.body.innerText;"), { timeout: 15_000 })
            .toContain("Add Torrent");
        return popup;
    }

    test("uploads the torrent even though the buffered record is cleared first", async ({ extension }) => {
        const flood = { id: "flood-1", name: "Fake flood", client: Client.FloodWebUI, port: client.port };
        await extension.settings.seed(makeFakeClientSettings({ ...flood, showPerTorrentConfigSelector: true }));
        await bufferCaughtTorrent(extension);

        const popup = await openAddPopup(extension);
        await popup.clickButton("Add Torrent");

        await expect.poll(() => client.pathsHit(), { timeout: 30_000 }).toContain("/api/torrents/add-files");
        const payload = JSON.parse(client.lastAddRequest()!.body) as { files: string[] };
        expect(payload.files).toHaveLength(1);
        expect(payload.files[0]!.length).toBeGreaterThan(0);
        expect(payload.files[0]).toMatch(/^ZDg6/);
    });
});
