import { describe, it, expect } from "vitest";
import { BiglyBTWebUI } from "../../src/webuis/biglybt-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new BiglyBTWebUI(makeWebUISettings({ host: "h", port: 9091, ...over }));

describe("BiglyBTWebUI", () => {
    it("targets the rpc endpoint for magnets and sends torrent-add json", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 200 }), // session cookie
            mockResponse({ status: 200, json: { result: "success" } }),
        );
        const result = await build().sendTorrent(makeMagnetTorrent(), { addPaused: true });

        expect(result.success).toBe(true);
        const [url, opts] = fetch.mock.calls[1];
        expect(url).toBe("http://h:9091/transmission/rpc");
        const payload = JSON.parse(opts.body as string);
        expect(payload.method).toBe("torrent-add");
        expect(payload.arguments.filename).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
    });

    it("targets the upload endpoint with paused query for a paused file torrent", async () => {
        const fetch = queueFetch(
            mockResponse({ status: 200 }),
            mockResponse({ status: 200, body: "<h1>200: OK</h1>" }),
        );
        const result = await build().sendTorrent(makeFileTorrent(), { addPaused: true });

        expect(result.success).toBe(true);
        expect(fetch.mock.calls[1][0]).toBe("http://h:9091/transmission/upload?paused=true");
        expect(fetch.mock.calls[1][1].body).toBeInstanceOf(FormData);
    });

    it("recognizes a JSON success body", async () => {
        queueFetch(mockResponse({ status: 200 }), mockResponse({ status: 200, json: { result: "success" } }));
        const result = await build().sendTorrent(makeFileTorrent(), {});
        expect(result.success).toBe(true);
    });

    it("rejects when the add response is neither OK html nor JSON success", async () => {
        queueFetch(mockResponse({ status: 200 }), mockResponse({ status: 200, json: { result: "fail" } }));
        await expect(build().sendTorrent(makeFileTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("supports only add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(false);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
