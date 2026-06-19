import { describe, it, expect } from "vitest";
import { RqbitWebUI } from "../../src/webuis/rqbit-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new RqbitWebUI(makeWebUISettings({ host: "h", port: 1337, ...over }));
const addOk = () => mockResponse({ status: 200, json: { id: 0 } });

describe("RqbitWebUI", () => {
    it("posts a magnet body to /torrents with output_folder/paused and Basic auth", async () => {
        const fetch = queueFetch(addOk());
        const result = await build().sendTorrent(makeMagnetTorrent(), { dir: "/movies", addPaused: true });

        expect(result.success).toBe(true);
        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe("http://h:1337/torrents?output_folder=%2Fmovies&paused=true");
        expect(opts.method).toBe("POST");
        expect(opts.body).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect((opts.headers as any).Authorization).toBe("Basic " + btoa("user:pass"));
    });

    it("sends the raw .torrent blob as the body for file torrents", async () => {
        const fetch = queueFetch(addOk());
        const torrent = makeFileTorrent();
        await build().sendTorrent(torrent, {});

        const [, opts] = fetch.mock.calls[0];
        expect(opts.body).toBe(torrent.data);
    });

    it("omits output_folder when no directory is set but always sends paused", async () => {
        const fetch = queueFetch(addOk());
        await build().sendTorrent(makeMagnetTorrent(), {});

        expect(fetch.mock.calls[0][0]).toBe("http://h:1337/torrents?paused=false");
    });

    it("omits the Authorization header when no credentials are configured", async () => {
        const fetch = queueFetch(addOk());
        await build({ username: "", password: "" }).sendTorrent(makeMagnetTorrent(), {});

        expect((fetch.mock.calls[0][1].headers as any).Authorization).toBeUndefined();
    });

    it("rejects when the request fails", async () => {
        queueFetch(mockResponse({ status: 401, body: "unauthorized" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("supports dirs and add-paused only", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
