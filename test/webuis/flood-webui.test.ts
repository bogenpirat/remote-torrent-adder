import { describe, it, expect } from "vitest";
import { FloodWebUI } from "../../src/webuis/flood-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new FloodWebUI(makeWebUISettings({ host: "h", port: 3000, ...over }));
const authOk = () => mockResponse({ status: 200, json: { success: true } });

describe("FloodWebUI", () => {
    it("authenticates then posts a magnet to add-urls", async () => {
        const fetch = queueFetch(authOk(), mockResponse({ status: 200 }));
        const result = await build().sendTorrent(makeMagnetTorrent(), { dir: "/d", label: "tv", addPaused: true });

        expect(result.success).toBe(true);
        expect(fetch.mock.calls[1][0]).toBe("http://h:3000/api/torrents/add-urls");
        const payload = JSON.parse(fetch.mock.calls[1][1].body as string);
        expect(payload.urls).toEqual(["magnet:?xt=urn:btih:abc123&dn=Cool+Torrent"]);
        expect(payload.destination).toBe("/d");
        expect(payload.tags).toEqual(["tv"]);
        expect(payload.start).toBe(false); // addPaused -> start false
    });

    it("posts file contents to add-files for a torrent file", async () => {
        const fetch = queueFetch(authOk(), mockResponse({ status: 202 }));
        const result = await build().sendTorrent(makeFileTorrent(), {});

        expect(result.success).toBe(true);
        expect(fetch.mock.calls[1][0]).toBe("http://h:3000/api/torrents/add-files");
        const payload = JSON.parse(fetch.mock.calls[1][1].body as string);
        expect(Array.isArray(payload.files)).toBe(true);
        expect(payload.files[0]).toBeTypeOf("string");
        expect(payload.start).toBe(true);
        expect(payload.tags).toEqual([]);
    });

    it("rejects when authentication is unsuccessful", async () => {
        queueFetch(mockResponse({ status: 200, json: { success: false } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toBeDefined();
    });

    it("rejects on a non-success add status (base fetch throws before status is read)", async () => {
        queueFetch(authOk(), mockResponse({ status: 500, body: "nope" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({
            success: false,
            httpResponseCode: 0,
            httpResponseBody: "HTTP error 500",
        });
    });

    it("supports labels and dirs and add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(true);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
