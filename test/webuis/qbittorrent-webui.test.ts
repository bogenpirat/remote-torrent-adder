import { describe, it, expect } from "vitest";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new QBittorrentWebUI(makeWebUISettings({ host: "h", port: 8080, ...over }));

describe("QBittorrentWebUI", () => {
    it("authenticates then posts the magnet url to the add endpoint", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }), mockResponse({ status: 200, body: "Ok." }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const [authUrl] = fetch.mock.calls[0];
        const [addUrl, addOpts] = fetch.mock.calls[1];
        expect(authUrl).toBe("http://h:8080/api/v2/auth/login");
        expect(addUrl).toBe("http://h:8080/api/v2/torrents/add");
        const body = addOpts.body as FormData;
        expect(body.get("urls")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
    });

    it("posts the torrent file with category, savepath and stopped flag", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }), mockResponse({ status: 200, body: "Ok." }));
        await build().sendTorrent(makeFileTorrent(), { dir: "/downloads", label: "movies", addPaused: true });

        const body = fetch.mock.calls[1][1].body as FormData;
        expect(body.get("torrents")).toBeInstanceOf(File);
        expect(body.get("savepath")).toBe("/downloads");
        expect(body.get("category")).toBe("movies");
        expect(body.get("stopped")).toBe("true");
    });

    it("reports failure with the real status when authentication fails", async () => {
        queueFetch(mockResponse({ status: 403, body: "Forbidden" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
            success: false,
            httpResponseCode: 403,
            httpResponseBody: "Forbidden",
        });
    });

    it("reports failure when the add endpoint returns the literal Fails. body", async () => {
        queueFetch(mockResponse({ status: 200 }), mockResponse({ status: 200, body: "Fails." }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
            success: false,
            httpResponseBody: "Fails.",
        });
    });

    it("reports the real status and body on a non-2xx add response", async () => {
        queueFetch(mockResponse({ status: 200 }), mockResponse({ status: 500, body: "err" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
            success: false,
            httpResponseCode: 500,
            httpResponseBody: "err",
        });
    });

    it("supports labels, dirs and add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(true);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
