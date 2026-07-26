import { describe, it, expect, vi } from "vitest";
import {
    generateId,
    moveItem,
    clearListeners,
    isMatchedByRegexes,
    getBaseUrl,
    addTrailingSlash,
    clearDynamicRules,
} from "../../src/util/utils";

describe("generateId", () => {
    it("returns a UUID string", () => {
        const id = generateId();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("returns unique values", () => {
        expect(generateId()).not.toBe(generateId());
    });
});

describe("moveItem", () => {
    it("moves an item down", () => {
        expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    });

    it("moves an item up", () => {
        expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    });

    it("swaps neighbours", () => {
        expect(moveItem(["a", "b", "c"], 1, 0)).toEqual(["b", "a", "c"]);
    });

    it("does not mutate the input", () => {
        const items = ["a", "b", "c"];
        moveItem(items, 0, 2);
        expect(items).toEqual(["a", "b", "c"]);
    });

    it("returns the same array reference for a no-op move", () => {
        const items = ["a", "b", "c"];
        expect(moveItem(items, 1, 1)).toBe(items);
    });

    it("returns the same array reference for out-of-range indices", () => {
        const items = ["a", "b", "c"];
        expect(moveItem(items, -1, 1)).toBe(items);
        expect(moveItem(items, 0, 3)).toBe(items);
        expect(moveItem(items, 3, 0)).toBe(items);
    });
});

describe("clearListeners", () => {
    it("removes the action icon listener when present", () => {
        const listener = vi.fn();
        clearListeners({ actionIconListener: listener });
        expect(chrome.action.onClicked.removeListener).toHaveBeenCalledWith(listener);
    });

    it("does nothing when listener is absent", () => {
        clearListeners({ actionIconListener: undefined as any });
        expect(chrome.action.onClicked.removeListener).not.toHaveBeenCalled();
    });
});

describe("isMatchedByRegexes", () => {
    it("returns true when any regex matches", () => {
        expect(isMatchedByRegexes("foo.torrent", [/\.mp3$/, /\.torrent$/])).toBe(true);
    });

    it("returns false when none match", () => {
        expect(isMatchedByRegexes("foo.mp3", [/\.torrent$/])).toBe(false);
    });

    it("returns false for an empty regex list", () => {
        expect(isMatchedByRegexes("anything", [])).toBe(false);
    });
});

describe("getBaseUrl", () => {
    it("returns the origin of a valid URL", () => {
        expect(getBaseUrl("https://example.com:8080/path?q=1")).toBe("https://example.com:8080");
    });

    it("returns an empty string for an invalid URL", () => {
        expect(getBaseUrl("not a url")).toBe("");
    });
});

describe("addTrailingSlash", () => {
    it("appends a slash when missing", () => {
        expect(addTrailingSlash("http://x.com")).toBe("http://x.com/");
    });

    it("leaves an existing trailing slash untouched", () => {
        expect(addTrailingSlash("http://x.com/")).toBe("http://x.com/");
    });
});

describe("clearDynamicRules", () => {
    it("removes all existing dynamic rule ids", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
        clearDynamicRules();
        await Promise.resolve();
        await Promise.resolve();
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({ removeRuleIds: [1, 2] });
    });

    it("does not call update when there are no rules", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as any).mockResolvedValue([]);
        clearDynamicRules();
        await Promise.resolve();
        await Promise.resolve();
        expect(chrome.declarativeNetRequest.updateDynamicRules).not.toHaveBeenCalled();
    });
});
