import { test, expect, type ExtensionHarness } from "./fixtures/extension";
import { expectNoProblems } from "./fixtures/expectations";
import { FakeQBittorrent, type FakeQBittorrentOptions } from "./fixtures/fake-qbittorrent";
import { makeFakeClientSettings } from "./fixtures/settings";
import { StaticSite } from "./fixtures/static-site";

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

async function configure(extension: ExtensionHarness, port: number, name = "Fake qBittorrent"): Promise<void> {
    await extension.settings.seed(makeFakeClientSettings({ port, name }));
}

async function clickCaughtLink(extension: ExtensionHarness): Promise<void> {
    const page = await extension.openPage(site.baseUrl + "/");
    await expect
        .poll(async () => (await extension.pageLinks(`${site.baseUrl}/*`)).length)
        .toBeGreaterThan(0);
    await page.click("#torrent-link");
}

test.describe("adding a torrent end to end", () => {
    test("clicking a caught link uploads the torrent to the client", async ({ extension, logs }) => {
        await startServers();
        await configure(extension, client.port);
        await extension.recorder.watchNotifications();

        await clickCaughtLink(extension);

        await expect.poll(() => client.pathsHit()).toContain("/api/v2/torrents/add");
        await logs.waitForQuiet();

        expect(client.pathsHit()).toContain("/api/v2/auth/login");

        const login = client.requests.find(request => request.path === "/api/v2/auth/login")!;
        expect(login.fields).toMatchObject({ username: "user", password: "pass" });

        const add = client.lastAddRequest()!;
        expect(add.method).toBe("POST");
        expect(Object.keys(add.files)).toContain("torrents");
        expect(add.files.torrents!.size).toBeGreaterThan(0);

        const notifications = await extension.recorder.notifications();
        expect(notifications.length, "a success notification should have been raised").toBeGreaterThan(0);

        await expectNoProblems(logs);
    });

    test("a client that rejects the torrent is reported, not thrown", async ({ extension, logs }) => {
        await startServers({ addResponse: "Fails." });
        await configure(extension, client.port);
        await extension.recorder.watchNotifications();

        await clickCaughtLink(extension);

        await expect.poll(() => client.pathsHit()).toContain("/api/v2/torrents/add");
        await expect.poll(async () => (await extension.recorder.notifications()).length).toBeGreaterThan(0);
        await logs.waitForQuiet();

        expect(
            await extension.evaluate(() => chrome.runtime.id),
            "the worker must still be alive after a rejected add",
        ).toBeTruthy();

        await expectNoProblems(logs);
    });

    test("an unreachable client does not take the worker down", async ({ extension, logs }) => {
        await startServers();
        const deadPort = client.port;
        await client.stop();
        clientStopped = true;

        await configure(extension, deadPort, "Offline");
        await extension.recorder.watchNotifications();

        await clickCaughtLink(extension);

        await expect.poll(async () => (await extension.recorder.notifications()).length).toBeGreaterThan(0);
        await logs.waitForQuiet();

        expect(await extension.evaluate(() => chrome.runtime.id)).toBeTruthy();
    });
});
