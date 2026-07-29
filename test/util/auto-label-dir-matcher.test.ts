import { describe, it, expect } from "vitest";
import { getAutoLabelResult, getAutoDirResult, explainAutoLabelDir } from "../../src/util/auto-label-dir-matcher";
import { Torrent } from "../../src/models/torrent";
import { AutoLabelDirSetting } from "../../src/models/webui";

const torrentWith = (trackers?: string[], files?: string[]): Torrent => ({
    data: "magnet:?x",
    name: "t",
    isMagnet: true,
    trackers,
    files,
});

const fileSetting = (value: string, label: string | null, dir: string | null): AutoLabelDirSetting => ({
    criteria: [{ field: "filePath", value }],
    label,
    dir,
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

describe("filePath criteria", () => {
    it("matches a regex against a file name inside the torrent", () => {
        const torrent = torrentWith(undefined, ["Season 01/ep01.mkv", "readme.nfo"]);
        expect(getAutoLabelResult(torrent, [fileSetting("\\.mkv$", "video", null)])).toBe("video");
    });

    it("matches against the full relative path, not just the basename", () => {
        const torrent = torrentWith(undefined, ["Season 01/ep01.mkv"]);
        expect(getAutoLabelResult(torrent, [fileSetting("^Season 01/", "series", null)])).toBe("series");
        expect(getAutoLabelResult(torrent, [fileSetting("^ep01", "wrong", null)])).toBeNull();
    });

    it("matches case-insensitively", () => {
        const torrent = torrentWith(undefined, ["Movie.MKV"]);
        expect(getAutoLabelResult(torrent, [fileSetting("\\.mkv$", "video", null)])).toBe("video");
    });

    it("does not match when the torrent has no file list (magnet link)", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"], undefined), [fileSetting("\\.mkv$", "video", null)])).toBeNull();
    });

    it("does not match against an empty file list", () => {
        expect(getAutoLabelResult(torrentWith(undefined, []), [fileSetting("\\.mkv$", "video", null)])).toBeNull();
    });

    it("does not throw and does not match on an invalid regex pattern", () => {
        expect(getAutoLabelResult(torrentWith(undefined, ["a.mkv"]), [fileSetting("(", "bad", null)])).toBeNull();
    });

    it("requires both a tracker and a file criterion to match", () => {
        const mixed: AutoLabelDirSetting = {
            criteria: [
                { field: "trackerUrl", value: "private\\.org" },
                { field: "filePath", value: "\\.mkv$" },
            ],
            label: "private-video",
            dir: null,
        };
        expect(getAutoLabelResult(torrentWith(["http://private.org/announce"], ["a.iso"]), [mixed])).toBeNull();
        expect(getAutoLabelResult(torrentWith(["http://other.org/announce"], ["a.mkv"]), [mixed])).toBeNull();
        expect(getAutoLabelResult(torrentWith(["http://private.org/announce"], ["a.mkv"]), [mixed])).toBe("private-video");
    });

    it("resolves a dir from a file criterion", () => {
        const torrent = torrentWith(undefined, ["disc.iso"]);
        expect(getAutoDirResult(torrent, [fileSetting("\\.iso$", null, "/images")])).toBe("/images");
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

describe("explainAutoLabelDir", () => {
    it("reports which trackers matched a criterion", () => {
        const torrent = torrentWith(["http://a.org/announce", "http://b.org/announce", "http://a.org/announce2"]);
        const explanation = explainAutoLabelDir(torrent, [setting("a\\.org", "l", "/d")]);

        expect(explanation.rules[0].matched).toBe(true);
        expect(explanation.rules[0].criteria[0].matchedCandidates)
            .toEqual(["http://a.org/announce", "http://a.org/announce2"]);
        expect(explanation.rules[0].criteria[0].invalidPattern).toBe(false);
    });

    it("reports which files matched a criterion", () => {
        const torrent = torrentWith(undefined, ["Season 01/ep01.mkv", "readme.nfo", "Season 01/ep02.MKV"]);
        const explanation = explainAutoLabelDir(torrent, [fileSetting("\\.mkv$", "video", null)]);

        expect(explanation.rules[0].criteria[0].matchedCandidates)
            .toEqual(["Season 01/ep01.mkv", "Season 01/ep02.MKV"]);
    });

    it("flags an invalid regex without matching", () => {
        const explanation = explainAutoLabelDir(torrentWith(["http://x"]), [setting("(", "bad", null)]);

        expect(explanation.rules[0].criteria[0].invalidPattern).toBe(true);
        expect(explanation.rules[0].criteria[0].matched).toBe(false);
        expect(explanation.rules[0].matched).toBe(false);
    });

    it("treats an empty criterion value as a vacuous match", () => {
        const explanation = explainAutoLabelDir(torrentWith([]), [setting("", "l", null)]);

        expect(explanation.rules[0].criteria[0].matched).toBe(true);
        expect(explanation.rules[0].criteria[0].matchedCandidates).toEqual([]);
        expect(explanation.rules[0].matched).toBe(true);
    });

    it("does not match a rule without criteria", () => {
        const explanation = explainAutoLabelDir(torrentWith(["http://x"]), [{ criteria: [], label: "x", dir: null }]);

        expect(explanation.rules[0].matched).toBe(false);
        expect(explanation.winningRuleIndex).toBeNull();
    });

    it("evaluates every rule and reports the first match as the winner", () => {
        const torrent = torrentWith(["http://a.org/announce"]);
        const explanation = explainAutoLabelDir(torrent, [
            setting("nope", "first", "/first"),
            setting("a\\.org", "second", "/second"),
            setting("a\\.org", "third", "/third"),
        ]);

        expect(explanation.rules.map(rule => rule.matched)).toEqual([false, true, true]);
        expect(explanation.winningRuleIndex).toBe(1);
        expect(explanation.label).toBe("second");
        expect(explanation.dir).toBe("/second");
    });

    it("keeps the index of each rule", () => {
        const explanation = explainAutoLabelDir(torrentWith(["http://a.org"]), [
            setting("nope", "first", null),
            setting("a\\.org", "second", null),
        ]);

        expect(explanation.rules.map(rule => rule.index)).toEqual([0, 1]);
        expect(explanation.rules[1].setting.label).toBe("second");
    });

    it("resolves label and dir from the same winning rule, even when null", () => {
        const torrent = torrentWith(["http://a.org/announce"]);
        const explanation = explainAutoLabelDir(torrent, [
            setting("a\\.org", "winner", null),
            setting("a\\.org", "loser", "/never-used"),
        ]);

        expect(explanation.label).toBe("winner");
        expect(explanation.dir).toBeNull();
    });

    it("returns an empty explanation for a null settings argument", () => {
        const explanation = explainAutoLabelDir(torrentWith(["http://x"]), null as any);

        expect(explanation.rules).toEqual([]);
        expect(explanation.winningRuleIndex).toBeNull();
        expect(explanation.label).toBeNull();
        expect(explanation.dir).toBeNull();
    });
});
