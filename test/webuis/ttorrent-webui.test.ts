import { describe, it, expect } from "vitest";
import { TTorrentWebUI } from "../../src/webuis/ttorrent-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new TTorrentWebUI(makeWebUISettings({ host: "h", port: 1080, ...over }));

describe("TTorrentWebUI", () => {
    it("posts a magnet url to /cmd/downloadFromUrl", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe("http://h:1080/cmd/downloadFromUrl");
        expect((opts.body as FormData).get("url")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
    });

    it("posts a torrent file to /cmd/downloadTorrent", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
        await build().sendTorrent(makeFileTorrent(), {});

        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe("http://h:1080/cmd/downloadTorrent");
        expect((opts.body as FormData).get("torrentfile")).toBeInstanceOf(Blob);
    });

    it("reports the real status and body on a non-2xx response", async () => {
        queueFetch(mockResponse({ status: 401, body: "auth" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
            success: false,
            httpResponseCode: 401,
            httpResponseBody: "auth",
        });
    });

    it("supports neither labels, dirs nor add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(false);
        expect(ui.isAddPausedSupported).toBe(false);
    });
});
