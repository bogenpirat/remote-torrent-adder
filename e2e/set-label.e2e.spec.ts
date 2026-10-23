import { test, expect } from "./fixtures/extension";
import { FakeQBittorrent } from "./fixtures/fake-qbittorrent";
import { makeSettings, makeWebUISettings } from "./fixtures/settings";
import { deserializeSettings } from "../src/util/serializer";

const INFO_HASH = "0123456789abcdef0123456789abcdef01234567";

let client: FakeQBittorrent;

test.afterEach(async () => {
    await client?.stop();
});

test.describe("labelling a torrent after it was added", () => {
    test("the label window sets the category on the client and remembers the label", async ({ extension, logs }) => {
        client = new FakeQBittorrent();
        await client.start();
        await extension.seedSettings(
            makeSettings([
                makeWebUISettings({
                    id: "webui-1",
                    name: "Fake qBittorrent",
                    host: "127.0.0.1",
                    port: client.port,
                    username: "user",
                    password: "pass",
                    labels: ["movies"],
                }),
            ]),
        );
        await expect.poll(async () => (await extension.sessionRules()).length).toBeGreaterThan(0);

        const query = new URLSearchParams({ mode: "label", webUiId: "webui-1", infoHash: INFO_HASH, torrentName: "Cool Torrent" });
        const page = await extension.openPage(extension.url(`popup/popup.html?${query}`));
        await expect(page.getByText("Cool Torrent in Fake qBittorrent")).toBeVisible();

        const input = page.getByPlaceholder("Select or type label...");
        await input.fill("tv");
        await page.getByRole("button", { name: "Set label" }).click();

        await expect.poll(() => client.pathsHit()).toContain("/api/v2/torrents/setCategory");
        const setCategory = client.requests.find(request => request.path === "/api/v2/torrents/setCategory")!;
        expect(setCategory.fields).toMatchObject({ hashes: INFO_HASH, category: "tv" });
        await expect.poll(async () => deserializeSettings((await extension.readSettings())!)?.webuiSettings[0]?.labels).toEqual(["tv", "movies"]);

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });
});
