import { describe, it, expect } from "vitest";
import { PorlaWebUI } from "../../src/webuis/porla-webui";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const build = (over = {}) => new PorlaWebUI(makeWebUISettings({ host: "h", port: 1337, ...over }));
const tokenOk = () => mockResponse({ status: 200, json: { token: "jwt-abc" } });

describe("PorlaWebUI", () => {
    it("logs in for a token then posts a magnet via jsonrpc", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        const result = await build().sendTorrent(makeMagnetTorrent(), { dir: "/movies" });

        expect(result.success).toBe(true);
        const [rpcUrl, rpcOpts] = fetch.mock.calls[1];
        expect(rpcUrl).toBe("http://h:1337/api/v1/jsonrpc");
        expect((rpcOpts.headers as any).Authorization).toBe("Bearer jwt-abc");
        const payload = JSON.parse(rpcOpts.body as string);
        expect(payload.method).toBe("torrents.add");
        expect(payload.params.magnet_uri).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(payload.params.save_path).toBe("/movies");
    });

    it("sends base64 torrent info and defaults save_path to ./", async () => {
        const fetch = queueFetch(tokenOk(), mockResponse({ status: 200, json: { result: {} } }));
        await build().sendTorrent(makeFileTorrent(), {});

        const payload = JSON.parse(fetch.mock.calls[1][1].body as string);
        expect(payload.params.ti).toBeTypeOf("string");
        expect(payload.params.save_path).toBe("./");
    });

    it("rejects when login returns an error", async () => {
        queueFetch(mockResponse({ status: 200, json: { error: "bad creds" } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("rejects when the jsonrpc response contains an error", async () => {
        queueFetch(tokenOk(), mockResponse({ status: 200, json: { error: { code: -1 } } }));
        await expect(build().sendTorrent(makeMagnetTorrent(), {})).rejects.toMatchObject({ success: false });
    });

    it("supports dirs only", () => {
        const ui = build();
        expect(ui.isLabelSupported).toBe(false);
        expect(ui.isDirSupported).toBe(true);
        expect(ui.isAddPausedSupported).toBe(false);
    });
});
