import { describe, it, expect } from "vitest";
import { ElementumWebUI } from "../../src/webuis/elementum-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new ElementumWebUI(makeWebUISettings({ host: "h", port: 65220, ...over }));

describe("ElementumWebUI", () => {
    it("posts a magnet uri to /playuri", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe("http://h:65220/playuri");
        const body = opts.body as FormData;
        expect(body.get("uri")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
    });

    it("posts a torrent file blob under the file field", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
        await build().sendTorrent(makeFileTorrent(), {});

        const body = fetch.mock.calls[0][1].body as FormData;
        expect(body.get("file")).toBeInstanceOf(Blob);
    });

    it("rejects on a non-200 response (base fetch throws before status is read)", async () => {
        queueFetch(mockResponse({ status: 500, body: "err" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({
            success: false,
            httpResponseCode: 0,
            httpResponseBody: "HTTP error 500",
        });
    });

    it("supports neither labels, dirs nor add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(false);
        expect(ui.isAddPausedSupported).toBe(false);
    });
});
