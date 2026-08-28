import { describe, it, expect } from "vitest";
import { buildTorrentFromMagnetLink, parseTorrentFile } from "../../src/util/torrent-source";
import { buildBencodedTorrent } from "../helpers/fixtures";

const torrentFile = (content: string, name = "test.torrent") =>
    new File([content], name, { type: "application/x-bittorrent" });

describe("buildTorrentFromMagnetLink", () => {
    it("parses the trackers from the tr parameters", () => {
        const magnet = "magnet:?xt=urn:btih:abc&dn=My+Movie" +
            "&tr=http%3A%2F%2Ftracker.one%2Fannounce" +
            "&tr=udp%3A%2F%2Ftracker.two%3A6969%2Fannounce";
        const torrent = buildTorrentFromMagnetLink(magnet);

        expect(torrent.isMagnet).toBe(true);
        expect(torrent.name).toBe("My Movie");
        expect(torrent.declaredName).toBe("My Movie");
        expect(torrent.data).toBe(magnet);
        expect(torrent.trackers).toEqual(["http://tracker.one/announce", "udp://tracker.two:6969/announce"]);
    });

    it("de-duplicates repeated trackers", () => {
        const magnet = "magnet:?xt=urn:btih:abc&tr=http%3A%2F%2Ft%2Fannounce&tr=http%3A%2F%2Ft%2Fannounce";
        expect(buildTorrentFromMagnetLink(magnet).trackers).toEqual(["http://t/announce"]);
    });

    it("returns an empty tracker list when the magnet has none", () => {
        expect(buildTorrentFromMagnetLink("magnet:?xt=urn:btih:abc").trackers).toEqual([]);
    });

    it("never exposes a file list, so file criteria cannot match", () => {
        expect(buildTorrentFromMagnetLink("magnet:?xt=urn:btih:abc&tr=http%3A%2F%2Ft").files).toBeUndefined();
    });

    it("does not throw on a malformed magnet link", () => {
        expect(buildTorrentFromMagnetLink("magnet:").trackers).toEqual([]);
    });

    it("leaves declaredName unset when the magnet has no dn parameter", () => {
        const torrent = buildTorrentFromMagnetLink("magnet:?xt=urn:btih:abc&tr=http%3A%2F%2Ft");

        expect(torrent.name).toBe("Some magnet link you clicked there, buddy.");
        expect(torrent.declaredName).toBeUndefined();
    });
});

describe("parseTorrentFile", () => {
    it("parses trackers, files and the private flag from a .torrent file", async () => {
        const file = torrentFile(buildBencodedTorrent({
            announce: "http://tracker.one/announce",
            "announce-list": [["http://tracker.two/announce"]],
            info: {
                name: "ubuntu.iso",
                private: 1,
                files: [{ path: ["folder", "a.bin"] }, { path: ["b.bin"] }],
            },
        }));

        const torrent = await parseTorrentFile(file);
        expect(torrent.isMagnet).toBe(false);
        expect(torrent.name).toBe("ubuntu.iso");
        expect(torrent.declaredName).toBe("ubuntu.iso");
        expect(torrent.trackers).toEqual(["http://tracker.one/announce", "http://tracker.two/announce"]);
        expect(torrent.files).toEqual(["folder/a.bin", "b.bin"]);
        expect(torrent.isPrivate).toBe(true);
    });

    it("falls back to the file name when the torrent has no name", async () => {
        const file = torrentFile(buildBencodedTorrent({ announce: "http://t/announce", info: {} }), "cool.torrent");
        const torrent = await parseTorrentFile(file);

        expect(torrent.name).toBe("cool.torrent");
        expect(torrent.declaredName).toBeUndefined();
    });

    it("rejects a file that is not bencoded", async () => {
        await expect(parseTorrentFile(torrentFile("<html>nope</html>", "fake.torrent")))
            .rejects.toThrow(/"fake.torrent" doesn't look like a .torrent file/);
    });

    it("rejects a bencoded file without an info dictionary", async () => {
        await expect(parseTorrentFile(torrentFile(buildBencodedTorrent({ announce: "http://t" }), "odd.torrent")))
            .rejects.toThrow(/doesn't look like a .torrent file/);
    });
});
