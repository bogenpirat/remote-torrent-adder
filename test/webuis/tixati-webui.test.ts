import { describe, it, expect } from "vitest";
import { TixatiWebUI } from "../../src/webuis/tixati-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new TixatiWebUI(makeWebUISettings({ host: "h", port: 8888, ...over }));

describe("TixatiWebUI", () => {
    it("posts a magnet to /transfers/action with addlink fields", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe("http://h:8888/transfers/action");
        const body = opts.body as FormData;
        expect(body.get("addlink")).toBe("Add");
        expect(body.get("addlinktext")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(body.get("noautostart")).toBe("0");
    });

    it("posts a metafile for a torrent file and honours add-paused", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
        await build().sendTorrent(makeFileTorrent(), { addPaused: true });

        const body = fetch.mock.calls[0][1].body as FormData;
        expect(body.get("addmetafile")).toBe("Add");
        expect(body.get("metafile")).toBeInstanceOf(Blob);
        expect(body.get("noautostart")).toBe("1");
    });

    it("reports the real status and body on a non-2xx response", async () => {
        queueFetch(mockResponse({ status: 403, body: "denied" }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
            success: false,
            httpResponseCode: 403,
            httpResponseBody: "denied",
        });
    });

    it("supports only add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(false);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
