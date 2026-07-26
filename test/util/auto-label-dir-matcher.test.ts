import { describe, it, expect } from "vitest";
import { getAutoLabelResult, getAutoDirResult } from "../../src/util/auto-label-dir-matcher";
import { Torrent } from "../../src/models/torrent";
import { AutoLabelDirSetting } from "../../src/models/webui";

const torrentWith = (trackers?: string[]): Torrent => ({
    data: "magnet:?x",
    name: "t",
    isMagnet: true,
    trackers,
});

const setting = (value: string, label: string | null, dir: string | null): AutoLabelDirSetting => ({
    criteria: [{ field: "trackerUrl", value }],
    label,
    dir,
});

describe("getAutoLabelResult", () => {
    it("returns the label of the first setting matching a tracker", () => {
        const torrent = torrentWith(["http://tracker.private.org/announce"]);
        const result = getAutoLabelResult(torrent, [setting("private\\.org", "private", "/p")]);
        expect(result).toBe("private");
    });

    it("returns the first match when multiple settings match", () => {
        const torrent = torrentWith(["http://a.org/announce"]);
        const result = getAutoLabelResult(torrent, [
            setting("a\\.org", "first", null),
            setting("a\\.org", "second", null),
        ]);
        expect(result).toBe("first");
    });

    it("returns null when no tracker matches", () => {
        const torrent = torrentWith(["http://other.org/announce"]);
        expect(getAutoLabelResult(torrent, [setting("private\\.org", "private", null)])).toBeNull();
    });

    it("returns null when the torrent has no trackers", () => {
        expect(getAutoLabelResult(torrentWith(undefined), [setting("x", "l", null)])).toBeNull();
    });

    it("returns null for an empty settings list", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"]), [])).toBeNull();
    });

    it("tolerates a null settings argument", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"]), null as any)).toBeNull();
    });
});

describe("criteria matching", () => {
    it("does not match a setting that has no criteria", () => {
        const noCriteria: AutoLabelDirSetting = { criteria: [], label: "x", dir: null };
        expect(getAutoLabelResult(torrentWith(["http://x"]), [noCriteria])).toBeNull();
    });

    it("does not throw and does not match on an invalid regex pattern", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"]), [setting("(", "bad", null)])).toBeNull();
    });

    it("requires every criterion to match", () => {
        const both: AutoLabelDirSetting = {
            criteria: [
                { field: "trackerUrl", value: "a\\.org" },
                { field: "trackerUrl", value: "b\\.org" },
            ],
            label: "ab",
            dir: null,
        };
        // only a.org is present, so the b.org criterion fails the whole setting
        expect(getAutoLabelResult(torrentWith(["http://a.org/announce"]), [both])).toBeNull();
        // both present -> matches
        expect(getAutoLabelResult(torrentWith(["http://a.org/announce", "http://b.org/announce"]), [both])).toBe("ab");
    });
});

describe("getAutoDirResult", () => {
    it("returns the dir of a matching setting", () => {
        const torrent = torrentWith(["http://tracker.foo.net/announce"]);
        expect(getAutoDirResult(torrent, [setting("foo\\.net", null, "/downloads/foo")])).toBe("/downloads/foo");
    });

    it("returns null when no tracker matches", () => {
        expect(getAutoDirResult(torrentWith(["http://bar"]), [setting("foo", null, "/x")])).toBeNull();
    });
});
