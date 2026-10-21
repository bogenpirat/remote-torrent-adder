import { describe, it, expect } from "vitest";
import { callArgs } from "../helpers/assert";
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
        const [addUrl, addOpts] = callArgs(fetch, 1);
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

        const payload = JSON.parse(callArgs(fetch, 1)[1].body as string);
        expect(payload.arguments.metainfo).toBeTypeOf("string");
        expect(payload.arguments["download-dir"]).toBe("/data");
        expect(payload.arguments.paused).toBe(true);
    });

    it("reports failure when the session-id request returns an unexpected status", async () => {
        queueFetch(mockResponse({ status: 500 }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("reports failure when the rpc result is not success", async () => {
        queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "duplicate torrent" } }),
        );
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("sets the label with torrent-set on the added torrent's hash, since torrent-add ignores labels before Transmission 4", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 409, headers: { "X-Transmission-Session-Id": "sess-123" } }),
            mockResponse({ status: 200, json: { result: "success", arguments: { "torrent-added": { hashString: "abc", id: 1 } } } }),
            mockResponse({ status: 200, json: { result: "success", arguments: {} } }),
        );
        const result = await build().sendTorrent(makeFileTorrent(), { label: "movies" });

        expect(result.success).toBe(true);
        const [setUrl, setOpts] = callArgs(fetch, 2);
        expect(setUrl).toBe("http://h:9091/transmission/rpc");
        expect((setOpts.headers as any)["X-Transmission-Session-Id"]).toBe("sess-123");
        expect(JSON.parse(setOpts.body as string)).toEqual({ method: "torrent-set", arguments: { ids: ["abc"], labels: ["movies"] } });
    });

    it("labels a torrent that was already present", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "success", arguments: { "torrent-duplicate": { hashString: "dup", id: 1 } } } }),
            mockResponse({ status: 200, json: { result: "success", arguments: {} } }),
        );
        await build().sendTorrent(makeMagnetTorrent(), { label: "movies" });

        expect(JSON.parse(callArgs(fetch, 2)[1].body as string).arguments.ids).toEqual(["dup"]);
    });

    it("falls back to the default label", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "success", arguments: { "torrent-added": { hashString: "abc", id: 1 } } } }),
            mockResponse({ status: 200, json: { result: "success", arguments: {} } }),
        );
        await build({ defaultLabel: "tv" }).sendTorrent(makeMagnetTorrent(), {});

        expect(JSON.parse(callArgs(fetch, 2)[1].body as string).arguments.labels).toEqual(["tv"]);
    });

    it("does not call torrent-set without a label", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "success", arguments: { "torrent-added": { hashString: "abc", id: 1 } } } }),
        );
        await build().sendTorrent(makeMagnetTorrent(), {});

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("reports failure when setting the label fails", async () => {
        queueFetch(
            mockResponse({ status: 200, headers: { "X-Transmission-Session-Id": "s" } }),
            mockResponse({ status: 200, json: { result: "success", arguments: { "torrent-added": { hashString: "abc", id: 1 } } } }),
            mockResponse({ status: 200, json: { result: "invalid argument" } }),
        );
        await expect(build().sendTorrent(makeMagnetTorrent(), { label: "movies" })).resolves.toMatchObject({ success: false });
    });

    it("supports labels, dir and add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(true);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
