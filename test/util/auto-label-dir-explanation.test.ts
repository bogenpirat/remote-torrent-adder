import { describe, it, expect } from "vitest";
import { explainAutoLabelDir } from "../../src/util/auto-label-dir-matcher";
import { at } from "../helpers/assert";
import { fileSetting, setting, torrentWith } from "../helpers/auto-label-dir";

describe("explainAutoLabelDir", () => {
    it("reports which trackers matched a criterion", () => {
        const torrent = torrentWith(["http://a.org/announce", "http://b.org/announce", "http://a.org/announce2"]);
        const explanation = explainAutoLabelDir(torrent, [setting("a\\.org", "l", "/d")]);

        expect(at(explanation.rules, 0).matched).toBe(true);
        expect(at(at(explanation.rules, 0).criteria, 0).matchedCandidates)
            .toEqual(["http://a.org/announce", "http://a.org/announce2"]);
        expect(at(at(explanation.rules, 0).criteria, 0).invalidPattern).toBe(false);
    });

    it("reports which files matched a criterion", () => {
        const torrent = torrentWith(undefined, ["Season 01/ep01.mkv", "readme.nfo", "Season 01/ep02.MKV"]);
        const explanation = explainAutoLabelDir(torrent, [fileSetting("\\.mkv$", "video", null)]);

        expect(at(at(explanation.rules, 0).criteria, 0).matchedCandidates)
            .toEqual(["Season 01/ep01.mkv", "Season 01/ep02.MKV"]);
    });

    it("flags an invalid regex without matching", () => {
        const explanation = explainAutoLabelDir(torrentWith(["http://x"]), [setting("(", "bad", null)]);

        expect(at(at(explanation.rules, 0).criteria, 0).invalidPattern).toBe(true);
        expect(at(at(explanation.rules, 0).criteria, 0).matched).toBe(false);
        expect(at(explanation.rules, 0).matched).toBe(false);
    });

    it("treats an empty criterion value as a vacuous match", () => {
        const explanation = explainAutoLabelDir(torrentWith([]), [setting("", "l", null)]);

        expect(at(at(explanation.rules, 0).criteria, 0).matched).toBe(true);
        expect(at(at(explanation.rules, 0).criteria, 0).matchedCandidates).toEqual([]);
        expect(at(explanation.rules, 0).matched).toBe(true);
    });

    it("does not match a rule without criteria", () => {
        const explanation = explainAutoLabelDir(torrentWith(["http://x"]), [{ criteria: [], label: "x", dir: null }]);

        expect(at(explanation.rules, 0).matched).toBe(false);
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
        expect(at(explanation.rules, 1).setting.label).toBe("second");
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
