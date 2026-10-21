import { describe, it, expect } from "vitest";
import { callArgs } from "../helpers/assert";
import { RqbitWebUI } from "../../src/webuis/rqbit-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new RqbitWebUI(makeWebUISettings({ host: "h", port: 1337, ...over }));
const addOk = () => mockResponse({ status: 200, json: { id: 0 } });

describe("RqbitWebUI", () => {
    it("posts a magnet body to /torrents with output_folder and Basic auth", async () => {
        const fetch = queueFetch(addOk());
        const result = await build().sendTorrent(makeMagnetTorrent(), { dir: "/movies" });

        expect(result.success).toBe(true);
        const [url, opts] = callArgs(fetch, 0);
        expect(url).toBe("http://h:1337/torrents?output_folder=%2Fmovies");
        expect(opts.method).toBe("POST");
        expect(opts.body).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect((opts.headers as any).Authorization).toBe("Basic " + btoa("user:pass"));
    });

    it("sends the raw .torrent blob as the body for file torrents", async () => {
        const fetch = queueFetch(addOk());
        const torrent = makeFileTorrent();
        await build().sendTorrent(torrent, {});

        const [, opts] = callArgs(fetch, 0);
        expect(opts.body).toBe(torrent.data);
    });

    it("sends no query string when no directory is set", async () => {
        const fetch = queueFetch(addOk());
        await build().sendTorrent(makeMagnetTorrent(), {});

        expect(callArgs(fetch, 0)[0]).toBe("http://h:1337/torrents");
    });

    it("pauses the added torrent by its id when adding paused, since the add endpoint has no paused parameter", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, json: { id: 7 } }), mockResponse({ status: 200 }));
        const result = await build().sendTorrent(makeMagnetTorrent(), { addPaused: true });

        expect(result.success).toBe(true);
        expect(callArgs(fetch, 0)[0]).toBe("http://h:1337/torrents");
        const [url, opts] = callArgs(fetch, 1);
        expect(url).toBe("http://h:1337/torrents/7/pause");
        expect(opts.method).toBe("POST");
        expect((opts.headers as any).Authorization).toBe("Basic " + btoa("user:pass"));
    });

    it("does not pause when adding unpaused", async () => {
        const fetch = queueFetch(addOk());
        await build().sendTorrent(makeMagnetTorrent(), { addPaused: false });

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("reports a failed pause as a failure", async () => {
        queueFetch(mockResponse({ status: 200, json: { id: 7 } }), mockResponse({ status: 404, body: "not found" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), { addPaused: true })).resolves.toMatchObject({
            success: false,
            httpResponseCode: 404,
        });
    });

    it("omits the Authorization header when no credentials are configured", async () => {
        const fetch = queueFetch(addOk());
        await build({ username: "", password: "" }).sendTorrent(makeMagnetTorrent(), {});

        expect((callArgs(fetch, 0)[1].headers as any).Authorization).toBeUndefined();
    });

    it("reports the real status and body when the request fails", async () => {
        queueFetch(mockResponse({ status: 401, body: "unauthorized" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
            success: false,
            httpResponseCode: 401,
            httpResponseBody: "unauthorized",
        });
    });

    it("supports dirs and add-paused only", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
