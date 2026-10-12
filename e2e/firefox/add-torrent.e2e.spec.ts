import { test, expect, type FirefoxExtensionHarness } from "../fixtures/firefox-extension";
import { NON_LOOPBACK_HOST } from "../fixtures/firefox-browser";
import { FakeQBittorrent, type FakeQBittorrentOptions } from "../fixtures/fake-qbittorrent";
import { makeFakeClientSettings } from "../fixtures/settings";
import { StaticSite } from "../fixtures/static-site";

const SITE_PATTERN = "http://127.0.0.1/*";
const ADD_PATH = "/api/v2/torrents/add";
const LOGIN_PATH = "/api/v2/auth/login";
const POST_LOGIN_TO = [
    'const login = { method: "POST", body: new URLSearchParams({ username: "u" }) };',
    `await fetch(args[0] + "${LOGIN_PATH}", login).catch(() => undefined);`,
].join("\n");

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

async function clickCaughtLink(extension: FirefoxExtensionHarness): Promise<void> {
    const page = await extension.openPage(`${site.baseUrl}/`);
    await expect.poll(async () => (await extension.pageLinks(SITE_PATTERN)).length).toBeGreaterThan(0);
    await page.click("#torrent-link");
}

async function waitForAddRequest(): Promise<void> {
    await expect.poll(() => client.pathsHit(), { timeout: 30_000 }).toContain(ADD_PATH);
}

/** A request the extension page makes to a client it has no CORS rule for, so its Origin header survives. */
async function sendControlRequest(extension: FirefoxExtensionHarness, control: FakeQBittorrent): Promise<void> {
    await extension.evaluate(POST_LOGIN_TO, control.baseUrl);
    await expect.poll(() => control.requests.length, { timeout: 15_000 }).toBeGreaterThan(0);
}

test.describe("adding a torrent end to end on firefox", () => {
    test("clicking a caught link uploads the torrent to the client", async ({ extension }) => {
        await startServers();
        await extension.settings.seed(makeFakeClientSettings({ port: client.port }));

        await clickCaughtLink(extension);
        await waitForAddRequest();

        expect(client.pathsHit()).toContain(LOGIN_PATH);
        const login = client.requests.find(request => request.path === LOGIN_PATH)!;
        expect(login.fields).toMatchObject({ username: "user", password: "pass" });

        const add = client.lastAddRequest()!;
        expect(add.method).toBe("POST");
        expect(Object.keys(add.files)).toContain("torrents");
        expect(add.files.torrents!.size).toBeGreaterThan(0);
    });

    test("reaches a plain-http client on a non-loopback host without upgrading to https", async ({ extension }) => {
        await startServers();
        await extension.settings.seed(makeFakeClientSettings({ port: client.port, name: "Remote qBittorrent", host: NON_LOOPBACK_HOST }));

        await clickCaughtLink(extension);

        await expect
            .poll(() => client.tlsHandshakes > 0 || client.pathsHit().includes(ADD_PATH), { timeout: 30_000 })
            .toBe(true);

        expect(client.tlsHandshakes, "the client request was upgraded to https").toBe(0);
        expect(client.pathsHit()).toContain(ADD_PATH);
        expect(client.requests[0]!.headers.host).toBe(`${NON_LOOPBACK_HOST}:${client.port}`);
    });

    test("strips the moz-extension Origin header from client requests", async ({ extension }) => {
        await startServers();
        await extension.settings.seed(makeFakeClientSettings({ port: client.port }));
        const control = new FakeQBittorrent();
        await control.start();

        try {
            await clickCaughtLink(extension);
            await waitForAddRequest();
            await sendControlRequest(extension, control);

            expect(
                control.requests[0]!.headers.origin,
                "the control request must carry an Origin, or this test proves nothing",
            ).toMatch(/^moz-extension:\/\//);
            expect(client.requests.filter(request => request.headers.origin !== undefined)).toEqual([]);
        } finally {
            await control.stop();
        }
    });

    test("a client that rejects the torrent is reported, not thrown", async ({ extension }) => {
        await startServers({ addResponse: "Fails." });
        await extension.settings.seed(makeFakeClientSettings({ port: client.port }));

        await clickCaughtLink(extension);
        await waitForAddRequest();

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
        await extension.settings.seed(makeFakeClientSettings({ port: deadPort, name: "Offline" }));

        await clickCaughtLink(extension);
        await extension.driver.sleep(3000);

        expect(await extension.evaluate<string>("return browser.runtime.id;")).toBeTruthy();
        expect(await extension.settings.read()).toBeTruthy();
    });
});
