import { describe, it, expect } from "vitest";
import {
    getTorrentNameFromMagnetLink,
    getTorrentNameFromLink,
    parseTrackersFromDecodedTorrentData,
    parseNameFromDecodedTorrentData,
    parseFilesFromDecodedTorrentData,
    parsePrivateFlagFromDecodedTorrentData,
} from "../../src/util/parsers";

const enc = (s: string) => new TextEncoder().encode(s);

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
        const data = { announce: enc("http://tracker.one/announce") };
        expect(parseTrackersFromDecodedTorrentData(data)).toEqual(["http://tracker.one/announce"]);
    });

    it("includes announce-list trackers and de-duplicates", () => {
        const data = {
            announce: enc("http://tracker.one/announce"),
            "announce-list": [[enc("http://tracker.one/announce")], [enc("http://tracker.two/announce")]],
        };
        expect(parseTrackersFromDecodedTorrentData(data)).toEqual([
            "http://tracker.one/announce",
            "http://tracker.two/announce",
        ]);
    });

    it("ignores a non-array entry in announce-list", () => {
        const data = {
            announce: enc("http://tracker.one/announce"),
            "announce-list": ["not-an-array"],
        };
        expect(parseTrackersFromDecodedTorrentData(data)).toEqual(["http://tracker.one/announce"]);
    });
});

describe("parseNameFromDecodedTorrentData", () => {
    it("decodes info.name", () => {
        expect(parseNameFromDecodedTorrentData({ info: { name: enc("ubuntu.iso") } })).toBe("ubuntu.iso");
    });

    it("returns null when info is missing", () => {
        expect(parseNameFromDecodedTorrentData({})).toBeNull();
    });

    it("returns null when name is missing", () => {
        expect(parseNameFromDecodedTorrentData({ info: {} })).toBeNull();
    });

    it("returns null for null/undefined data", () => {
        expect(parseNameFromDecodedTorrentData(null)).toBeNull();
        expect(parseNameFromDecodedTorrentData(undefined)).toBeNull();
    });
});

describe("parseFilesFromDecodedTorrentData", () => {
    it("returns the last path segment of each file", () => {
        const data = {
            info: {
                files: [
                    { path: [enc("dir"), enc("a.mkv")] },
                    { path: [enc("b.nfo")] },
                ],
            },
        };
        expect(parseFilesFromDecodedTorrentData(data)).toEqual(["a.mkv", "b.nfo"]);
    });

    it("returns an empty array for a single-file torrent (no files key)", () => {
        expect(parseFilesFromDecodedTorrentData({ info: { name: enc("x") } })).toEqual([]);
    });

    it("returns an empty array when info is missing", () => {
        expect(parseFilesFromDecodedTorrentData({})).toEqual([]);
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
