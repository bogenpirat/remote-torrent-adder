import { describe, it, expect } from "vitest";
import type { DecodedTorrent } from "../../src/models/decoded-torrent";
import {
    getDeclaredTorrentNameFromMagnetLink,
    getTorrentNameFromMagnetLink,
    getTorrentNameFromLink,
    parseTrackersFromDecodedTorrentData,
    parseNameFromDecodedTorrentData,
    parseFilesFromDecodedTorrentData,
    parsePrivateFlagFromDecodedTorrentData,
} from "../../src/util/parsers";
import { utf8Bytes } from "../helpers/bytes";

describe("getTorrentNameFromMagnetLink", () => {
    it("extracts and decodes the dn parameter", () => {
        expect(getTorrentNameFromMagnetLink("magnet:?xt=urn:btih:abc&dn=My%20Torrent")).toBe("My Torrent");
    });

    it("converts plus signs to spaces", () => {
        expect(getTorrentNameFromMagnetLink("magnet:?dn=Cool+Torrent+Name")).toBe("Cool Torrent Name");
    });

    it("stops at the next parameter boundary", () => {
        expect(getTorrentNameFromMagnetLink("magnet:?dn=Foo&tr=http://tracker")).toBe("Foo");
    });

    it("returns a fallback message when dn is absent", () => {
        expect(getTorrentNameFromMagnetLink("magnet:?xt=urn:btih:abc")).toBe(
            "Some magnet link you clicked there, buddy.",
        );
    });

    it("does not throw on a name containing a bare percent sign", () => {
        expect(getTorrentNameFromMagnetLink("magnet:?dn=50%+off")).toBe("50% off");
    });
});

describe("getDeclaredTorrentNameFromMagnetLink", () => {
    it("returns the decoded dn parameter", () => {
        expect(getDeclaredTorrentNameFromMagnetLink("magnet:?xt=urn:btih:abc&dn=My%20Torrent")).toBe("My Torrent");
    });

    it.each([
        ["dn is absent", "magnet:?xt=urn:btih:abc"],
        ["the magnet link is malformed", "magnet:"],
        ["dn is present but empty", "magnet:?xt=urn:btih:abc&dn="],
        ["dn= only appears inside another parameter's value", "magnet:?xt=urn:btih:abc&as=http://mirror.example/get?hdn=Bogus"],
    ])("declares no name when %s", (_situation, magnetLink) => {
        expect(getDeclaredTorrentNameFromMagnetLink(magnetLink)).toBeUndefined();
    });

    it("keeps a name containing a bare percent sign instead of throwing", () => {
        expect(getDeclaredTorrentNameFromMagnetLink("magnet:?xt=urn:btih:abc&dn=Deadpool.100%.Fun"))
            .toBe("Deadpool.100%.Fun");
    });
});

describe("getTorrentNameFromLink", () => {
    it("extracts the trailing .torrent filename", () => {
        expect(getTorrentNameFromLink("https://site.com/path/ubuntu.torrent")).toBe("ubuntu.torrent");
    });

    it("falls back to file.torrent when no match", () => {
        expect(getTorrentNameFromLink("https://site.com/download?id=5")).toBe("file.torrent");
    });

    it("handles a bare filename URL", () => {
        expect(getTorrentNameFromLink("https://site.com/x.torrent")).toBe("x.torrent");
    });
});

describe("parseTrackersFromDecodedTorrentData", () => {
    it("returns the single announce tracker", () => {
        const data = { announce: utf8Bytes("http://tracker.one/announce") };
        expect(parseTrackersFromDecodedTorrentData(data)).toEqual(["http://tracker.one/announce"]);
    });

    it("includes announce-list trackers and de-duplicates", () => {
        const data = {
            announce: utf8Bytes("http://tracker.one/announce"),
            "announce-list": [[utf8Bytes("http://tracker.one/announce")], [utf8Bytes("http://tracker.two/announce")]],
        };
        expect(parseTrackersFromDecodedTorrentData(data)).toEqual([
            "http://tracker.one/announce",
            "http://tracker.two/announce",
        ]);
    });

    it("returns no trackers when the torrent has no announce key", () => {
        expect(parseTrackersFromDecodedTorrentData({ info: {} })).toEqual([]);
        expect(parseTrackersFromDecodedTorrentData({ "announce-list": [[utf8Bytes("http://tracker.two/announce")]] }))
            .toEqual(["http://tracker.two/announce"]);
    });

    it("ignores a non-array entry in announce-list", () => {
        // deliberately malformed: announce-list entries must themselves be lists
        const data = {
            announce: utf8Bytes("http://tracker.one/announce"),
            "announce-list": ["not-an-array"],
        } as unknown as DecodedTorrent;
        expect(parseTrackersFromDecodedTorrentData(data)).toEqual(["http://tracker.one/announce"]);
    });
});

describe("parseNameFromDecodedTorrentData", () => {
    it("decodes info.name", () => {
        expect(parseNameFromDecodedTorrentData({ info: { name: utf8Bytes("ubuntu.iso") } })).toBe("ubuntu.iso");
    });

    it("returns nothing when info is missing", () => {
        expect(parseNameFromDecodedTorrentData({})).toBeUndefined();
    });

    it("returns nothing when name is missing", () => {
        expect(parseNameFromDecodedTorrentData({ info: {} })).toBeUndefined();
    });

    it("returns nothing for null/undefined data", () => {
        expect(parseNameFromDecodedTorrentData(null)).toBeUndefined();
        expect(parseNameFromDecodedTorrentData(undefined)).toBeUndefined();
    });
});

describe("parseFilesFromDecodedTorrentData", () => {
    it("joins the path segments of each file", () => {
        const data = {
            info: {
                files: [
                    { path: [utf8Bytes("dir"), utf8Bytes("a.mkv")] },
                    { path: [utf8Bytes("b.nfo")] },
                ],
            },
        };
        expect(parseFilesFromDecodedTorrentData(data)).toEqual(["dir/a.mkv", "b.nfo"]);
    });

    it("falls back to info.name for a single-file torrent (no files key)", () => {
        expect(parseFilesFromDecodedTorrentData({ info: { name: utf8Bytes("x.iso") } })).toEqual(["x.iso"]);
    });

    it("returns an empty array when info has neither files nor name", () => {
        expect(parseFilesFromDecodedTorrentData({ info: {} })).toEqual([]);
    });

    it("returns an empty array when info is missing", () => {
        expect(parseFilesFromDecodedTorrentData({})).toEqual([]);
    });

    it("returns an empty array for null data", () => {
        expect(parseFilesFromDecodedTorrentData(null)).toEqual([]);
    });

    it("falls back to info.name when files is not an array", () => {
        const malformed = { info: { name: utf8Bytes("x.iso"), files: "nope" } } as unknown as DecodedTorrent;

        expect(parseFilesFromDecodedTorrentData(malformed)).toEqual(["x.iso"]);
    });

    it("tolerates a file entry with a missing path", () => {
        expect(parseFilesFromDecodedTorrentData({ info: { files: [{}, { path: [utf8Bytes("b.nfo")] }] } })).toEqual(["", "b.nfo"]);
    });
});

describe("parsePrivateFlagFromDecodedTorrentData", () => {
    it("returns true when info.private === 1", () => {
        expect(parsePrivateFlagFromDecodedTorrentData({ info: { private: 1 } })).toBe(true);
    });

    it("returns false when info.private === 0", () => {
        expect(parsePrivateFlagFromDecodedTorrentData({ info: { private: 0 } })).toBe(false);
    });

    it("returns false when private flag is absent", () => {
        expect(parsePrivateFlagFromDecodedTorrentData({ info: {} })).toBe(false);
    });

    it("returns false for null data", () => {
        expect(parsePrivateFlagFromDecodedTorrentData(null)).toBe(false);
    });
});
