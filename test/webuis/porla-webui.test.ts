import { describe, it, expect } from "vitest";
import { callArgs } from "../helpers/assert";
import { PorlaWebUI } from "../../src/webuis/porla-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new PorlaWebUI(makeWebUISettings({ host: "h", port: 1337, ...over }));
const tokenOk = () => mockResponse({ status: 200, json: { jsonrpc: "2.0", id: 1, result: { token: "jwt-abc" } } });

describe("PorlaWebUI", () => {
    it("logs in for a token then posts a magnet via jsonrpc", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        const result = await build().sendTorrent(makeMagnetTorrent(), { dir: "/movies" });

        expect(result.success).toBe(true);
        const [loginUrl, loginOpts] = callArgs(fetch, 0);
        expect(loginUrl).toBe("http://h:1337/api/v1/jsonrpc");
        expect(JSON.parse(loginOpts.body as string)).toMatchObject({ method: "auth.login", params: { username: expect.any(String), password: expect.any(String) } });
        const [rpcUrl, rpcOpts] = callArgs(fetch, 1);
        expect(rpcUrl).toBe("http://h:1337/api/v1/jsonrpc");
        expect((rpcOpts.headers as any).Authorization).toBe("Bearer jwt-abc");
        const payload = JSON.parse(rpcOpts.body as string);
        expect(payload.method).toBe("torrents.add");
        expect(payload.params.magnet_uri).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(payload.params.save_path).toBe("/movies");
        expect(payload.params).not.toHaveProperty("preset");
    });

    it("sends base64 torrent info and defaults save_path to ./", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        await build().sendTorrent(makeFileTorrent(), {});

        const payload = JSON.parse(callArgs(fetch, 1)[1].body as string);
        expect(payload.params.ti).toBeTypeOf("string");
        expect(payload.params.save_path).toBe("./");
    });

    it("reports failure when login returns an error", async () => {
        queueFetch(mockResponse({ status: 200, json: { jsonrpc: "2.0", id: 1, error: { code: -1, message: "Invalid username/password combination" } } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("reports failure when the jsonrpc response contains an error", async () => {
        queueFetch(tokenOk(), mockResponse({ status: 200, json: { error: { code: -1 } } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({ success: false });
    });

    it("supports labels and dirs", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(true);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(false);
    });
    it("sends the label as the category when adding", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        await build().sendTorrent(makeFileTorrent(), { label: "movies" });

        expect(JSON.parse(callArgs(fetch, 1)[1].body as string).params.category).toBe("movies");
    });

    it("omits the category when there is no label", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        await build().sendTorrent(makeMagnetTorrent(), {});

        expect(JSON.parse(callArgs(fetch, 1)[1].body as string).params).not.toHaveProperty("category");
    });

    it("sets the category of an existing torrent with torrents.properties.set", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        const result = await build().setLabel("0123456789abcdef0123456789abcdef01234567".toUpperCase(), "movies");

        expect(result.success).toBe(true);
        const [url, opts] = callArgs(fetch, 1);
        expect(url).toBe("http://h:1337/api/v1/jsonrpc");
        expect((opts.headers as any).Authorization).toBe("Bearer jwt-abc");
        const payload = JSON.parse(opts.body as string);
        expect(payload.method).toBe("torrents.properties.set");
        expect(payload.params).toEqual({ info_hash: "0123456789abcdef0123456789abcdef01234567", category: "movies" });
    });

    it("reports failure when torrents.properties.set returns an error", async () => {
        queueFetch(tokenOk(), mockResponse({ status: 200, json: { error: { code: -6 } } }));
        await expect(build().setLabel("0123456789abcdef0123456789abcdef01234567", "movies")).resolves.toMatchObject({ success: false });
    });
    it("passes the connection test only when auth.login returns a token", async () => {
        queueFetch(tokenOk());
        await expect(build().testConnection()).resolves.toMatchObject({ reachable: true, authenticated: true });

        queueFetch(mockResponse({ status: 200, json: { jsonrpc: "2.0", id: 1, error: { code: -1, message: "nope" } } }));
        await expect(build().testConnection()).resolves.toMatchObject({ reachable: true, authenticated: false });
    });
});
