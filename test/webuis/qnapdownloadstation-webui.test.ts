import { describe, it, expect } from "vitest";
import { QNAPDownloadStationWebUI } from "../../src/webuis/qnapdownloadstation-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) =>
    new QNAPDownloadStationWebUI(makeWebUISettings({ host: "h", port: 8080, username: "u", password: "p", ...over }));
const loginOk = () => mockResponse({ status: 200, json: { sid: "sid-1" } });

describe("QNAPDownloadStationWebUI", () => {
    it("logs in with base64 password then adds a magnet via AddUrl", async () => {
        const fetch = queueFetch(loginOk(), mockResponse({ status: 200, json: { error: 0 } }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        const loginBody = fetch.mock.calls[0][1].body as FormData;
        expect(loginBody.get("user")).toBe("u");
        expect(loginBody.get("pass")).toBe(btoa("p"));
        const [addUrl, addOpts] = fetch.mock.calls[1];
        expect(addUrl).toBe("http://h:8080/downloadstation/V4/Task/AddUrl");
        expect((addOpts.body as FormData).get("url")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect((addOpts.body as FormData).get("sid")).toBe("sid-1");
    });

    it("adds a torrent file via AddTorrent with temp/move dirs", async () => {
        const fetch = queueFetch(loginOk(), mockResponse({ status: 200, json: { error: 0 } }));
        await build().sendTorrent(makeFileTorrent(), { dir: "/share/dl" });

        const [addUrl, addOpts] = fetch.mock.calls[1];
        expect(addUrl).toBe("http://h:8080/downloadstation/V4/Task/AddTorrent");
        const body = addOpts.body as FormData;
        expect(body.get("file")).toBeInstanceOf(Blob);
        expect(body.get("temp")).toBe("/share/dl");
        expect(body.get("move")).toBe("/share/dl");
    });

    it("treats the already-exists error code 8196 as success", async () => {
        queueFetch(loginOk(), mockResponse({ status: 200, json: { error: 8196 } }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});
        expect(result.success).toBe(true);
    });

    it("rejects when login does not return a sid", async () => {
        queueFetch(mockResponse({ status: 200, json: {} }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("rejects on an error code other than 0/8196", async () => {
        queueFetch(loginOk(), mockResponse({ status: 200, json: { error: 1 } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("supports dirs only", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(false);
    });
});
