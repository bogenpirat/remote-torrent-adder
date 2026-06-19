import { describe, it, expect } from "vitest";
import { TransmissionWebUI } from "../../src/webuis/transmission-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new TransmissionWebUI(makeWebUISettings({ host: "h", port: 9091, ...over }));

describe("TransmissionWebUI", () => {
    it("fetches a session id then sends torrent-add with the magnet filename", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 409, headers: { "X-Transmission-Session-Id": "sess-123" } }),
            mockResponse({ status: 200, json: { result: "success" } }),
        );
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const [addUrl, addOpts] = fetch.mock.calls[1];
        expect(addUrl).toBe("http://h:9091/transmission/rpc");
        expect((addOpts.headers as any)["X-Transmission-Session-Id"]).toBe("sess-123");
        const payload = JSON.parse(addOpts.body as string);
        expect(payload.method).toBe("torrent-add");
        expect(payload.arguments.filename).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
    });

    it("sends base64 metainfo with download-dir and paused for a file torrent", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "success" } }),
        );
        await build().sendTorrent(makeFileTorrent(), { dir: "/data", addPaused: true });

        const payload = JSON.parse(fetch.mock.calls[1][1].body as string);
        expect(payload.arguments.metainfo).toBeTypeOf("string");
        expect(payload.arguments["download-dir"]).toBe("/data");
        expect(payload.arguments.paused).toBe("true");
    });

    it("rejects when the session-id request returns an unexpected status", async () => {
        queueFetch(mockResponse({ status: 500 }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("rejects when the rpc result is not success", async () => {
        queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "duplicate torrent" } }),
        );
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("supports dir and add-paused but not labels", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
