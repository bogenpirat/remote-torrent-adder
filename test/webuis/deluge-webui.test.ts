import { describe, it, expect } from "vitest";
import { DelugeWebUI } from "../../src/webuis/deluge-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new DelugeWebUI(makeWebUISettings({ host: "h", port: 8112, ...over }));

const authOk = () => mockResponse({ status: 200, json: { result: true } });
const addOk = () => mockResponse({ status: 200, json: { result: [[true, "torrent-hash"]] } });

describe("DelugeWebUI", () => {
    it("authenticates then adds a magnet via web.add_torrents", async () => {
        const fetch = queueFetch(authOk(), addOk());
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const authPayload = JSON.parse(fetch.mock.calls[0][1].body as string);
        expect(authPayload.method).toBe("auth.login");
        expect(authPayload.params).toEqual(["pass"]);
        const addPayload = JSON.parse(fetch.mock.calls[1][1].body as string);
        expect(addPayload.method).toBe("web.add_torrents");
        expect(addPayload.params[0][0].path).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
    });

    it("uploads a file then adds the returned path with download_location", async () => {
        const fetch = queueFetch(
            authOk(),
            mockResponse({ status: 200, json: { success: true, files: ["/tmp/uploaded.torrent"] } }),
            addOk(),
        );
        await build().sendTorrent(makeFileTorrent(), { dir: "/media" });

        expect(fetch.mock.calls[1][0]).toBe("http://h:8112/upload");
        const addPayload = JSON.parse(fetch.mock.calls[2][1].body as string);
        expect(addPayload.params[0][0].path).toBe("/tmp/uploaded.torrent");
        expect(addPayload.params[0][0].options.download_location).toBe("/media");
    });

    it("adds a label via two extra calls when config.label is set", async () => {
        const fetch = queueFetch(
            authOk(),
            addOk(),
            mockResponse({ status: 200, json: {} }), // label.add
            mockResponse({ status: 200, json: {} }), // label.set_torrent
        );
        const result = await build().sendTorrent(makeMagnetTorrent(), { label: "Movies" });

        expect(result.success).toBe(true);
        const labelAdd = JSON.parse(fetch.mock.calls[2][1].body as string);
        expect(labelAdd.method).toBe("label.add");
        expect(labelAdd.params).toEqual(["movies"]); // lower-cased
        const labelSet = JSON.parse(fetch.mock.calls[3][1].body as string);
        expect(labelSet.method).toBe("label.set_torrent");
        expect(labelSet.params).toEqual(["torrent-hash", "movies"]);
    });

    it("falls back to the configured default label when the upload has none", async () => {
        const fetch = queueFetch(
            authOk(),
            addOk(),
            mockResponse({ status: 200, json: {} }), // label.add
            mockResponse({ status: 200, json: {} }), // label.set_torrent
        );
        const result = await build({ defaultLabel: "Shows" }).sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const labelAdd = JSON.parse(fetch.mock.calls[2][1].body as string);
        expect(labelAdd.method).toBe("label.add");
        expect(labelAdd.params).toEqual(["shows"]); // default label, lower-cased
    });

    it("reports failure when authentication result is false", async () => {
        queueFetch(mockResponse({ status: 200, json: { result: false } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("reports failure when add returns a falsey result tuple", async () => {
        queueFetch(authOk(), mockResponse({ status: 200, json: { result: [[false]] } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("reports failure when file upload fails", async () => {
        queueFetch(authOk(), mockResponse({ status: 200, json: { success: false, files: [] } }));
        await expect(build().sendTorrent(makeFileTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("supports labels, dirs and add-paused", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(true);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(true);
    });
});
