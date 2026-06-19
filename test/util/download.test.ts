import { describe, it, expect } from "vitest";
import { downloadTorrent } from "../../src/util/download";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";
import { buildBencodedTorrent } from "../helpers/fixtures";

describe("downloadTorrent (magnet)", () => {
    it("returns magnet metadata without fetching", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }));
        const torrent = await downloadTorrent("magnet:?xt=urn:btih:abc&dn=My+Movie");

        expect(fetch).not.toHaveBeenCalled();
        expect(torrent.isMagnet).toBe(true);
        expect(torrent.data).toBe("magnet:?xt=urn:btih:abc&dn=My+Movie");
        expect(torrent.name).toBe("My Movie");
    });
});

describe("downloadTorrent (file)", () => {
    it("fetches, decodes and parses a bencoded torrent", async () => {
        const body = buildBencodedTorrent({
            announce: "http://tracker.one/announce",
            "announce-list": [["http://tracker.two/announce"]],
            info: {
                name: "ubuntu.iso",
                private: 1,
                files: [{ path: ["folder", "a.bin"] }, { path: ["b.bin"] }],
            },
        });
        queueFetch(mockResponse({ status: 200, body }));

        const torrent = await downloadTorrent("https://site.com/ubuntu.torrent");
        expect(torrent.isMagnet).toBe(false);
        expect(torrent.name).toBe("ubuntu.iso");
        expect(torrent.data).toBeInstanceOf(Blob);
        expect(torrent.trackers).toEqual(["http://tracker.one/announce", "http://tracker.two/announce"]);
        expect(torrent.files).toEqual(["a.bin", "b.bin"]);
        expect(torrent.isPrivate).toBe(true);
    });

    it("falls back to the url filename when the torrent has no name", async () => {
        const body = buildBencodedTorrent({ announce: "http://t/announce", info: {} });
        queueFetch(mockResponse({ status: 200, body }));

        const torrent = await downloadTorrent("https://site.com/path/cool.torrent");
        expect(torrent.name).toBe("cool.torrent");
    });

    it("rejects when the response is not ok", async () => {
        queueFetch(mockResponse({ status: 404, body: "" }));
        await expect(downloadTorrent("https://site.com/missing.torrent")).rejects.toThrow(/Status not OK/);
    });

    it("rejects with a helpful message when the body is not a torrent", async () => {
        queueFetch(mockResponse({ status: 200, body: "<html>nope</html>", headers: { "Content-Type": "text/html; charset=utf-8" } }));
        await expect(downloadTorrent("https://site.com/fake.torrent")).rejects.toThrow(/text\/html instead of a torrent/);
    });
});
