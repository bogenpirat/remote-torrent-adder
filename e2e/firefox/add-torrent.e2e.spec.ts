import { test, expect, type FirefoxExtensionHarness } from "../fixtures/firefox-extension";
import { FakeQBittorrent, type FakeQBittorrentOptions } from "../fixtures/fake-qbittorrent";
import { makeSettings, makeWebUISettings } from "../fixtures/settings";
import { StaticSite } from "../fixtures/static-site";

// Match patterns carry no port, and Firefox rejects one where Chrome tolerates it.
const SITE_PATTERN = "http://127.0.0.1/*";

let site: StaticSite;
let client: FakeQBittorrent;
let clientStopped = false;

async function startServers(options: FakeQBittorrentOptions = {}): Promise<void> {
    site = new StaticSite();
    client = new FakeQBittorrent(options);
    clientStopped = false;
    await site.start();
    await client.start();
}

test.afterEach(async () => {
    await site?.stop();
    if (client && !clientStopped) {
        await client.stop();
    }
});

async function configure(extension: FirefoxExtensionHarness, port: number, name = "Fake qBittorrent"): Promise<void> {
    await extension.seedSettings(
        makeSettings([
            makeWebUISettings({
                id: "webui-1",
                name,
                host: "127.0.0.1",
                port,
                username: "user",
                password: "pass",
            }),
        ]),
    );
}

async function clickCaughtLink(extension: FirefoxExtensionHarness): Promise<void> {
    await extension.openPage(`${site.baseUrl}/`);
    await expect.poll(async () => (await extension.pageLinks(SITE_PATTERN)).length).toBeGreaterThan(0);
    await extension.clickInPage("#torrent-link");
}

test.describe("adding a torrent end to end on firefox", () => {
    test("clicking a caught link uploads the torrent to the client", async ({ extension }) => {
        await startServers();
        await configure(extension, client.port);

        await clickCaughtLink(extension);

        await expect.poll(() => client.pathsHit(), { timeout: 30_000 }).toContain("/api/v2/torrents/add");

        expect(client.pathsHit()).toContain("/api/v2/auth/login");
        const login = client.requests.find(request => request.path === "/api/v2/auth/login")!;
        expect(login.fields).toMatchObject({ username: "user", password: "pass" });

        const add = client.lastAddRequest()!;
        expect(add.method).toBe("POST");
        expect(Object.keys(add.files)).toContain("torrents");
        expect(add.files.torrents!.size).toBeGreaterThan(0);
    });

    /**
     * The declarativeNetRequest rules in cors-tricks.ts exist to strip the
     * Origin header, which most torrent WebUIs reject outright. If this
     * regresses on Firefox every client integration fails at once, so it is
     * asserted against a real request rather than by reading the rule back.
     */
    test("strips the moz-extension Origin header from client requests", async ({ extension }) => {
        await startServers();
        await configure(extension, client.port);

        // A second server the extension has no rule for, proving the assertion
        // below would actually fail if the rules stopped applying.
        const control = new FakeQBittorrent();
        await control.start();

        try {
            await clickCaughtLink(extension);
            await expect.poll(() => client.pathsHit(), { timeout: 30_000 }).toContain("/api/v2/torrents/add");

            await extension.evaluate(
                'await fetch(args[0] + "/api/v2/auth/login", { method: "POST", body: new URLSearchParams({ username: "u" }) }).catch(() => undefined);',
                control.baseUrl,
            );
            await expect.poll(() => control.requests.length, { timeout: 15_000 }).toBeGreaterThan(0);

            expect(
                control.requests[0]!.headers.origin,
                "the control request must carry an Origin, or this test proves nothing",
            ).toMatch(/^moz-extension:\/\//);

            for (const request of client.requests) {
                expect(request.headers.origin, `${request.path} must not carry an Origin`).toBeUndefined();
            }
        } finally {
            await control.stop();
        }
    });

    test("a client that rejects the torrent is reported, not thrown", async ({ extension }) => {
        await startServers({ addResponse: "Fails." });
        await configure(extension, client.port);

        await clickCaughtLink(extension);

        await expect.poll(() => client.pathsHit(), { timeout: 30_000 }).toContain("/api/v2/torrents/add");

        expect(
            await extension.evaluate<string>("return browser.runtime.id;"),
            "the event page must still be alive after a rejected add",
        ).toBeTruthy();
    });

    test("an unreachable client does not take the event page down", async ({ extension }) => {
        await startServers();
        const deadPort = client.port;
        await client.stop();
        clientStopped = true;

        await configure(extension, deadPort, "Offline");

        await clickCaughtLink(extension);
        await extension.driver.sleep(3000);

        expect(await extension.evaluate<string>("return browser.runtime.id;")).toBeTruthy();
        expect(await extension.readSettings()).toBeTruthy();
    });
});
