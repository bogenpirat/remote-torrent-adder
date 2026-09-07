import { test, expect } from "../fixtures/firefox-extension";
import { FakeFlood } from "../fixtures/fake-flood";
import { StaticSite } from "../fixtures/static-site";
import { makeSettings, makeWebUISettings } from "../fixtures/settings";
import { Client } from "../../src/models/clients";

const SITE_PATTERN = "http://127.0.0.1/*";

/**
 * The label/dir popup path, which parks the torrent in IndexedDB and clears the
 * record as soon as the popup hands back the user's choices.
 *
 * Firefox backs an IndexedDB Blob with the record it came from, so clearing the
 * record invalidates a payload that is still being uploaded: the read fails
 * with "NotFoundError: Node was not found" and the torrent silently never
 * arrives. The client is deliberately slow to authenticate, because flood
 * authenticates before it encodes the torrent - without that latency the read
 * wins the race against the delete and the bug hides.
 */
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

    test("uploads the torrent even though the buffered record is cleared first", async ({ extension }) => {
        await extension.seedSettings(
            makeSettings([
                makeWebUISettings({
                    id: "flood-1",
                    name: "Fake flood",
                    client: Client.FloodWebUI,
                    host: "127.0.0.1",
                    port: client.port,
                    showPerTorrentConfigSelector: true,
                }),
            ]),
        );

        await extension.openPage(`${site.baseUrl}/`);
        await expect.poll(async () => (await extension.pageLinks(SITE_PATTERN)).length).toBeGreaterThan(0);
        await extension.clickInPage("#torrent-link");

        await expect
            .poll(() => extension.hasBufferedTorrent(), { timeout: 20_000 })
            .toBe(true);

        await extension.openExtensionPage(extension.url("popup/popup.html"));
        await expect
            .poll(async () => extension.evaluateHere<string>("return document.body.innerText;"), { timeout: 15_000 })
            .toContain("Add Torrent");

        await extension.clickHereByText("Add Torrent");

        // The popup closes itself once the worker accepts, so nothing may touch
        // that tab again; the client is the only observer left.
        await expect
            .poll(() => client.pathsHit(), { timeout: 30_000 })
            .toContain("/api/torrents/add-files");

        const add = client.lastAddRequest()!;
        const payload = JSON.parse(add.body) as { files: string[] };
        expect(payload.files).toHaveLength(1);
        expect(payload.files[0]!.length).toBeGreaterThan(0);
        // The bencoded fixture starts "d8:announce"; base64 of that starts ZDg6.
        expect(payload.files[0]).toMatch(/^ZDg6/);
    });
});
