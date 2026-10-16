import { describe, it, expect } from "vitest";
import { getAutoLabelResult, getAutoDirResult, explainAutoLabelDir } from "../../src/util/auto-label-dir-matcher";
import { type Torrent } from "../../src/models/torrent";
import { type AutoLabelDirSetting } from "../../src/models/webui";
import { at } from "../helpers/assert";
import { fileSetting, nameSetting, setting, torrentWith } from "../helpers/auto-label-dir";

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

    it("returns nothing when no tracker matches", () => {
        const torrent = torrentWith(["http://other.org/announce"]);
        expect(getAutoLabelResult(torrent, [setting("private\\.org", "private", null)])).toBeUndefined();
    });

    it("returns nothing when the torrent has no trackers", () => {
        expect(getAutoLabelResult(torrentWith(undefined), [setting("x", "l", null)])).toBeUndefined();
    });

    it("returns nothing for an empty settings list", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"]), [])).toBeUndefined();
    });

    it("tolerates a null settings argument", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"]), null as any)).toBeUndefined();
    });
});

describe("criteria matching", () => {
    it("does not match a setting that has no criteria", () => {
        const noCriteria: AutoLabelDirSetting = { criteria: [], label: "x", dir: null };
        expect(getAutoLabelResult(torrentWith(["http://x"]), [noCriteria])).toBeUndefined();
    });

    it("does not throw and does not match on an invalid regex pattern", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"]), [setting("(", "bad", null)])).toBeUndefined();
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
        expect(getAutoLabelResult(torrentWith(["http://a.org/announce"]), [both])).toBeUndefined();
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
        expect(getAutoLabelResult(torrent, [fileSetting("^ep01", "wrong", null)])).toBeUndefined();
    });

    it("matches case-insensitively", () => {
        const torrent = torrentWith(undefined, ["Movie.MKV"]);
        expect(getAutoLabelResult(torrent, [fileSetting("\\.mkv$", "video", null)])).toBe("video");
    });

    it("does not match when the torrent has no file list (magnet link)", () => {
        expect(getAutoLabelResult(torrentWith(["http://x"], undefined), [fileSetting("\\.mkv$", "video", null)])).toBeUndefined();
    });

    it("does not match against an empty file list", () => {
        expect(getAutoLabelResult(torrentWith(undefined, []), [fileSetting("\\.mkv$", "video", null)])).toBeUndefined();
    });

    it("does not throw and does not match on an invalid regex pattern", () => {
        expect(getAutoLabelResult(torrentWith(undefined, ["a.mkv"]), [fileSetting("(", "bad", null)])).toBeUndefined();
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
        expect(getAutoLabelResult(torrentWith(["http://private.org/announce"], ["a.iso"]), [mixed])).toBeUndefined();
        expect(getAutoLabelResult(torrentWith(["http://other.org/announce"], ["a.mkv"]), [mixed])).toBeUndefined();
        expect(getAutoLabelResult(torrentWith(["http://private.org/announce"], ["a.mkv"]), [mixed])).toBe("private-video");
    });

    it("resolves a dir from a file criterion", () => {
        const torrent = torrentWith(undefined, ["disc.iso"]);
        expect(getAutoDirResult(torrent, [fileSetting("\\.iso$", null, "/images")])).toBe("/images");
    });
});

describe("torrentName criteria", () => {
    const movieName = "Kartoffelsalat.Im.Weltall.2099.German.DL.2160p.UHD.BluRay.DV.HDR.x265-KAROTTE";

    it("matches a regex against the torrent name", () => {
        const torrent = torrentWith(undefined, undefined, movieName);
        expect(getAutoLabelResult(torrent, [nameSetting("2160p", "MOVIES/2160p", "/movies/2160p")])).toBe("MOVIES/2160p");
        expect(getAutoDirResult(torrent, [nameSetting("2160p", "MOVIES/2160p", "/movies/2160p")])).toBe("/movies/2160p");
    });

    it("matches case-insensitively", () => {
        const torrent = torrentWith(undefined, undefined, movieName);
        expect(getAutoLabelResult(torrent, [nameSetting("2160P\\.uhd", "uhd", null)])).toBe("uhd");
    });

    it("works for magnet links that carry no file list", () => {
        const torrent = torrentWith(["http://x"], undefined, "Some.Show.S01E01.1080p.WEB-DL");
        expect(getAutoLabelResult(torrent, [nameSetting("1080p", "hd", null)])).toBe("hd");
    });

    it("returns nothing when the name does not match", () => {
        const torrent = torrentWith(undefined, undefined, movieName);
        expect(getAutoLabelResult(torrent, [nameSetting("720p", "sd", null)])).toBeUndefined();
    });

    it("does not throw and does not match on an invalid regex pattern", () => {
        expect(getAutoLabelResult(torrentWith(undefined, undefined, movieName), [nameSetting("(", "bad", null)])).toBeUndefined();
    });

    it("reports the name as the matched candidate in the explanation", () => {
        const explanation = explainAutoLabelDir(torrentWith(undefined, undefined, movieName), [nameSetting("2160p", "l", null)]);
        expect(at(at(explanation.rules, 0).criteria, 0).matchedCandidates).toEqual([movieName]);
    });

    it("does not match a torrent that declares no name of its own", () => {
        const undeclared: Torrent = {
            data: "magnet:?xt=urn:btih:abc",
            name: "Some magnet link you clicked there, buddy.",
            isMagnet: true,
            trackers: ["http://x"],
        };

        expect(getAutoLabelResult(undeclared, [nameSetting("magnet", "l", null)])).toBeUndefined();
        expect(getAutoLabelResult(undeclared, [nameSetting("link", "l", null)])).toBeUndefined();
        expect(getAutoLabelResult(undeclared, [nameSetting("buddy", "l", null)])).toBeUndefined();
    });

    it("matches the declared name rather than the display fallback", () => {
        const torrent: Torrent = {
            data: "magnet:?xt=urn:btih:abc&dn=Real.Name.2160p",
            name: "Real.Name.2160p",
            declaredName: "Real.Name.2160p",
            isMagnet: true,
        };

        expect(getAutoLabelResult(torrent, [nameSetting("2160p", "uhd", null)])).toBe("uhd");
    });

    it("can be combined with a tracker criterion", () => {
        const mixed: AutoLabelDirSetting = {
            criteria: [
                { field: "trackerUrl", value: "private\\.org" },
                { field: "torrentName", value: "2160p" },
            ],
            label: "private-uhd",
            dir: null,
        };
        expect(getAutoLabelResult(torrentWith(["http://private.org/announce"], undefined, "a.1080p"), [mixed])).toBeUndefined();
        expect(getAutoLabelResult(torrentWith(["http://other.org/announce"], undefined, movieName), [mixed])).toBeUndefined();
        expect(getAutoLabelResult(torrentWith(["http://private.org/announce"], undefined, movieName), [mixed])).toBe("private-uhd");
    });
});

describe("unknown criterion fields", () => {
    it("does not match a criterion with an unknown field", () => {
        const unknown: AutoLabelDirSetting = {
            criteria: [{ field: "bogus" as any, value: "x" }],
            label: "l",
            dir: null,
        };
        expect(getAutoLabelResult(torrentWith(["http://x"]), [unknown])).toBeUndefined();
    });

    it("does not match a criterion with an unknown field and an empty pattern", () => {
        const unknown: AutoLabelDirSetting = {
            criteria: [{ field: "bogus" as any, value: "" }],
            label: "l",
            dir: null,
        };
        expect(getAutoLabelResult(torrentWith(["http://x"]), [unknown])).toBeUndefined();
    });

    it("still lets an empty pattern on a known field match anything", () => {
        const empty: AutoLabelDirSetting = {
            criteria: [{ field: "trackerUrl", value: "" }],
            label: "l",
            dir: null,
        };
        expect(getAutoLabelResult(torrentWith(["http://x"]), [empty])).toBe("l");
    });
});

describe("getAutoDirResult", () => {
    it("returns the dir of a matching setting", () => {
        const torrent = torrentWith(["http://tracker.foo.net/announce"]);
        expect(getAutoDirResult(torrent, [setting("foo\\.net", null, "/downloads/foo")])).toBe("/downloads/foo");
    });

    it("returns nothing when no tracker matches", () => {
        expect(getAutoDirResult(torrentWith(["http://bar"]), [setting("foo", null, "/x")])).toBeUndefined();
    });
});
