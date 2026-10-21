import { test, expect } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { rutorrent } from "./fixtures/clients/rutorrent";

test.describe("ruTorrent", () => {
    const suite = defineClientSuite(rutorrent);

    test("appends the torrent name to a multi-file torrent's directory by default", async ({ extension, logs }) => {
        const torrent = suite.torrents().createTorrent({ multiFile: true });
        const state = await suite.addAndFind(extension, logs, { torrent, config: { dir: rutorrent.dir } });
        expect(state.dir).toBe(`${rutorrent.dir}/${torrent.name}`);
    });

    test("don't add name path keeps a multi-file torrent in the directory itself", async ({ extension, logs }) => {
        const torrent = suite.torrents().createTorrent({ multiFile: true });
        const state = await suite.addAndFind(extension, logs, {
            torrent,
            config: { dir: rutorrent.dir },
            settings: { clientSpecificSettings: { dontAddNamePath: true } },
        });
        expect(state.dir).toBe(rutorrent.dir);
    });
});
