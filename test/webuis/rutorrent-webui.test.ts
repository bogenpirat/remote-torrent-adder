import { describe, it, expect } from "vitest";
import { RuTorrentWebUI } from "../../src/webuis/rutorrent-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new RuTorrentWebUI(makeWebUISettings({ host: "h", port: 80, ...over }));

describe("RuTorrentWebUI", () => {
    it("posts a magnet as a urlencoded url body with config in the query string", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "addTorrentSuccess" }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {
            dir: "/dl",
            label: "tv",
            addPaused: true,
        });

        expect(result.success).toBe(true);
        const [url, opts] = fetch.mock.calls[0];
        expect(url).toContain("/php/addtorrent.php?");
        expect(url).toContain("dir_edit=%2Fdl");
        expect(url).toContain("label=tv");
        expect(url).toContain("torrents_start_stopped=1");
        expect((opts.headers as any)["Content-Type"]).toBe("application/x-www-form-urlencoded");
        expect(opts.body).toBe("url=magnet%3A%3Fxt%3Durn%3Abtih%3Aabc123%26dn%3DCool%2BTorrent");
    });

    it("posts a torrent file as multipart form data with dir and label fields", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "addTorrentSuccess" }));
        await build().sendTorrent(makeFileTorrent(), { dir: "/dl", label: "movies" });

        const body = fetch.mock.calls[0][1].body as FormData;
        expect(body.get("dir_edit")).toBe("/dl");
        expect(body.get("label")).toBe("movies");
        expect(body.get("torrent_file")).toBeInstanceOf(Blob);
    });

    it("includes not_add_path when the client-specific flag is set", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "addTorrentSuccess" }));
        await build({ clientSpecificSettings: { dontAddNamePath: true } }).sendTorrent(makeMagnetTorrent(), {});
        expect(fetch.mock.calls[0][0]).toContain("not_add_path=1");
    });

    it("treats a success in the response url as success", async () => {
        queueFetch(mockResponse({ status: 200, body: "", url: "http://h/x?result[]=Success" }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});
        expect(result.success).toBe(true);
    });

    it("reports failure when neither the url nor body signal success", async () => {
        queueFetch(mockResponse({ status: 200, body: "addTorrentFailure", url: "http://h/x" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("supports labels, dirs and add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(true);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
