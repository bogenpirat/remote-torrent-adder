import { describe, it, expect } from "vitest";
import { callArgs } from "../helpers/assert";
import { type Torrent, type TorrentUploadConfig } from "../../src/models/torrent";
import { SynologyDownloadStationWebUI } from "../../src/webuis/synologydownloadstation-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) =>
    new SynologyDownloadStationWebUI(makeWebUISettings({ host: "nas", port: 5000, username: "u", password: "p", ...over }));

const AUTH_V7 = { path: "auth.cgi", minVersion: 1, maxVersion: 7 };
const AUTH_V3 = { path: "auth.cgi", minVersion: 1, maxVersion: 3 };
const LEGACY_TASK = { path: "DownloadStation/task.cgi", minVersion: 1, maxVersion: 3 };
const MODERN_TASK = { path: "DownloadStation/task.cgi", minVersion: 1, maxVersion: 2 };

const discovery = (data: Record<string, unknown>) => mockResponse({ status: 200, json: { success: true, data } });

const modernDiscovery = (auth = AUTH_V7) =>
    discovery({
        "SYNO.API.Auth": auth,
        "SYNO.DownloadStation.Task": LEGACY_TASK,
        "SYNO.DownloadStation2.Task": MODERN_TASK,
    });

const legacyDiscovery = (auth = AUTH_V7) =>
    discovery({
        "SYNO.API.Auth": auth,
        "SYNO.DownloadStation.Task": LEGACY_TASK,
    });

const loginOk = () => mockResponse({ status: 200, json: { success: true, data: { sid: "sid-1" } } });
const createOk = () => mockResponse({ status: 200, json: { success: true } });
const apiError = (code: number) => mockResponse({ status: 200, json: { success: false, error: { code } } });

/** Adds the torrent to a device that accepts it, and returns the request that created the task. */
async function taskRequest(discoveryResponse: Response, torrent: Torrent, config: TorrentUploadConfig): Promise<any[]> {
    const fetch = queueFetch(discoveryResponse, loginOk(), createOk());
    await build().sendTorrent(torrent, config);
    return callArgs(fetch, 2);
}

function uploadedFileName(body: FormData, field: string): string {
    const upload = body.get(field);
    expect(upload).toBeInstanceOf(File);
    return (upload as File).name;
}

describe("SynologyDownloadStationWebUI", () => {
    it("queries the API list, logs in with format=sid, then creates the task", async () => {
        const fetch = queueFetch(modernDiscovery(), loginOk(), createOk());
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(3);

        const [infoUrl] = callArgs(fetch, 0);
        expect(infoUrl).toContain("http://nas:5000/webapi/query.cgi?");
        expect(infoUrl).toContain("api=SYNO.API.Info");
        expect(decodeURIComponent(infoUrl)).toContain("SYNO.DownloadStation2.Task");

        const [loginUrl, loginOpts] = callArgs(fetch, 1);
        expect(loginUrl).toBe("http://nas:5000/webapi/auth.cgi");
        expect(loginOpts.method).toBe("POST");

        const loginBody = new URLSearchParams(loginOpts.body.toString());
        expect(loginBody.get("account")).toBe("u");
        expect(loginBody.get("passwd")).toBe("p");
        expect(loginBody.get("format")).toBe("sid");
        expect(loginBody.get("session")).toBe("DownloadStation");
    });

    it("logs in with auth version 6 when the device reports maxVersion 7", async () => {
        const fetch = queueFetch(modernDiscovery(AUTH_V7), loginOk(), createOk());
        await build().sendTorrent(makeMagnetTorrent(), {});

        const loginBody = new URLSearchParams(callArgs(fetch, 1)[1].body.toString());
        expect(loginBody.get("version")).toBe("6");
    });

    it("logs in with auth version 2 when the device predates DSM 7", async () => {
        const fetch = queueFetch(legacyDiscovery(AUTH_V3), loginOk(), createOk());
        await build().sendTorrent(makeMagnetTorrent(), {});

        const loginBody = new URLSearchParams(callArgs(fetch, 1)[1].body.toString());
        expect(loginBody.get("version")).toBe("2");
    });

    it("creates a magnet task through DownloadStation2 using unquoted query params", async () => {
        const [url, options] = await taskRequest(modernDiscovery(), makeMagnetTorrent(), { dir: "video/movies" });

        expect(options).toBeUndefined();
        expect(new URL(url).pathname).toBe("/webapi/DownloadStation/task.cgi");
        expect(Object.fromEntries(new URL(url).searchParams)).toMatchObject({
            _sid: "sid-1",
            api: "SYNO.DownloadStation2.Task",
            version: "2",
            method: "create",
            type: "url",
            url: "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent",
            create_list: "false",
            destination: "video/movies",
        });
    });

    it("creates a torrent-file task through DownloadStation2 with JSON-quoted form values", async () => {
        const [url, options] = await taskRequest(modernDiscovery(), makeFileTorrent(), { dir: "video/movies" });

        expect(new URL(url).searchParams.get("_sid")).toBe("sid-1");
        expect(options.method).toBe("POST");
        expect(Object.fromEntries(options.body)).toMatchObject({
            api: "SYNO.DownloadStation2.Task",
            type: '"file"',
            file: '["fileData"]',
            destination: '"video/movies"',
            create_list: "false",
        });
        expect(uploadedFileName(options.body, "fileData")).toBe("file.torrent");
    });

    it("appends the DownloadStation2 upload part last, as the API requires", async () => {
        const [, options] = await taskRequest(modernDiscovery(), makeFileTorrent(), { dir: "video/movies" });

        expect([...options.body.keys()].at(-1)).toBe("fileData");
    });

    it("falls back to the legacy task API when DownloadStation2 is absent", async () => {
        const [url, options] = await taskRequest(legacyDiscovery(), makeMagnetTorrent(), { dir: "video/movies" });

        expect(url).toBe("http://nas:5000/webapi/DownloadStation/task.cgi");
        expect(options.method).toBe("POST");
        expect(Object.fromEntries(new URLSearchParams(options.body.toString()))).toEqual({
            api: "SYNO.DownloadStation.Task",
            version: "3",
            method: "create",
            _sid: "sid-1",
            uri: "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent",
            destination: "video/movies",
        });
    });

    it("uploads a torrent file through the legacy task API with the file part last", async () => {
        const [url, options] = await taskRequest(legacyDiscovery(), makeFileTorrent(), {});

        expect(url).toBe("http://nas:5000/webapi/DownloadStation/task.cgi");
        expect(Object.fromEntries(options.body)).toMatchObject({ api: "SYNO.DownloadStation.Task", version: "2", _sid: "sid-1" });
        expect(uploadedFileName(options.body, "file")).toBe("file.torrent");
        expect([...options.body.keys()].at(-1)).toBe("file");
    });

    it("strips a leading slash from the destination", async () => {
        const [, options] = await taskRequest(legacyDiscovery(), makeMagnetTorrent(), { dir: "/video/movies" });

        expect(new URLSearchParams(options.body.toString()).get("destination")).toBe("video/movies");
    });

    it("omits the destination when neither a config dir nor a default is set", async () => {
        const [, options] = await taskRequest(legacyDiscovery(), makeMagnetTorrent(), {});

        expect(new URLSearchParams(options.body.toString()).has("destination")).toBe(false);
    });

    it("reports a task error code as a readable message", async () => {
        queueFetch(modernDiscovery(), loginOk(), apiError(403));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(false);
        expect(result.httpResponseBody).toBe("Destination does not exist");
    });

    it("reports an unmapped error code through the common error table", async () => {
        queueFetch(modernDiscovery(), loginOk(), apiError(105));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(false);
        expect(result.httpResponseBody).toBe("The logged in session does not have permission");
    });

    it("explains that two-step verification is unsupported rather than showing a raw code", async () => {
        queueFetch(modernDiscovery(), apiError(403));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result.success).toBe(false);
        expect(result.httpResponseBody).toContain("Two-step verification");
    });

    it("propagates the status of a non-OK HTTP response", async () => {
        queueFetch(modernDiscovery(), loginOk(), mockResponse({ status: 500, body: "boom" }));
        const result = await build().sendTorrent(makeMagnetTorrent(), {});

        expect(result).toMatchObject({ success: false, httpResponseCode: 500 });
    });

    it("reports reachable and authenticated when the login succeeds", async () => {
        queueFetch(modernDiscovery(), loginOk());

        await expect(build().testConnection()).resolves.toMatchObject({ reachable: true, authenticated: true });
    });

    it("reports a wrong password as reachable but not authenticated", async () => {
        queueFetch(modernDiscovery(), apiError(400));
        const result = await build().testConnection();

        expect(result).toMatchObject({ reachable: true, authenticated: false });
        expect(result.message).toContain("No such account or incorrect password");
    });

    it("supports dirs only", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(false);
    });
});
