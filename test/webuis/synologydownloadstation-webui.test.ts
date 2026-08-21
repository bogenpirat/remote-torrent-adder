import { describe, it, expect } from "vitest";
import { callArgs } from "../helpers/assert";
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
        const fetch = queueFetch(modernDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeMagnetTorrent(), { dir: "video/movies" });

        const [url, options] = callArgs(fetch, 2);
        expect(options).toBeUndefined();

        const params = new URL(url).searchParams;
        expect(new URL(url).pathname).toBe("/webapi/DownloadStation/task.cgi");
        expect(params.get("_sid")).toBe("sid-1");
        expect(params.get("api")).toBe("SYNO.DownloadStation2.Task");
        expect(params.get("version")).toBe("2");
        expect(params.get("method")).toBe("create");
        expect(params.get("type")).toBe("url");
        expect(params.get("url")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(params.get("create_list")).toBe("false");
        expect(params.get("destination")).toBe("video/movies");
    });

    it("creates a torrent-file task through DownloadStation2 with JSON-quoted form values", async () => {
        const fetch = queueFetch(modernDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeFileTorrent(), { dir: "video/movies" });

        const [url, options] = callArgs(fetch, 2);
        expect(new URL(url).searchParams.get("_sid")).toBe("sid-1");
        expect(options.method).toBe("POST");

        const body = options.body as FormData;
        expect(body.get("api")).toBe("SYNO.DownloadStation2.Task");
        expect(body.get("type")).toBe('"file"');
        expect(body.get("file")).toBe('["fileData"]');
        expect(body.get("destination")).toBe('"video/movies"');
        expect(body.get("create_list")).toBe("false");
        expect(body.get("fileData")).toBeInstanceOf(File);
        expect((body.get("fileData") as File).name).toBe("file.torrent");
    });

    it("appends the DownloadStation2 upload part last, as the API requires", async () => {
        const fetch = queueFetch(modernDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeFileTorrent(), { dir: "video/movies" });

        const body = callArgs(fetch, 2)[1].body as FormData;
        expect([...body.keys()].at(-1)).toBe("fileData");
    });

    it("falls back to the legacy task API when DownloadStation2 is absent", async () => {
        const fetch = queueFetch(legacyDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeMagnetTorrent(), { dir: "video/movies" });

        const [url, options] = callArgs(fetch, 2);
        expect(url).toBe("http://nas:5000/webapi/DownloadStation/task.cgi");
        expect(options.method).toBe("POST");

        const body = new URLSearchParams(options.body.toString());
        expect(body.get("api")).toBe("SYNO.DownloadStation.Task");
        expect(body.get("version")).toBe("3");
        expect(body.get("method")).toBe("create");
        expect(body.get("_sid")).toBe("sid-1");
        expect(body.get("uri")).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(body.get("destination")).toBe("video/movies");
    });

    it("uploads a torrent file through the legacy task API with the file part last", async () => {
        const fetch = queueFetch(legacyDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeFileTorrent(), {});

        const [url, options] = callArgs(fetch, 2);
        expect(url).toBe("http://nas:5000/webapi/DownloadStation/task.cgi");

        const body = options.body as FormData;
        expect(body.get("api")).toBe("SYNO.DownloadStation.Task");
        expect(body.get("version")).toBe("2");
        expect(body.get("_sid")).toBe("sid-1");
        expect(body.get("file")).toBeInstanceOf(File);
        expect((body.get("file") as File).name).toBe("file.torrent");
        expect([...body.keys()].at(-1)).toBe("file");
    });

    it("strips a leading slash from the destination", async () => {
        const fetch = queueFetch(legacyDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeMagnetTorrent(), { dir: "/video/movies" });

        const body = new URLSearchParams(callArgs(fetch, 2)[1].body.toString());
        expect(body.get("destination")).toBe("video/movies");
    });

    it("omits the destination when neither a config dir nor a default is set", async () => {
        const fetch = queueFetch(legacyDiscovery(), loginOk(), createOk());
        await build().sendTorrent(makeMagnetTorrent(), {});

        const body = new URLSearchParams(callArgs(fetch, 2)[1].body.toString());
        expect(body.has("destination")).toBe(false);
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
