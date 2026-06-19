import { describe, it, expect } from "vitest";
import { cn } from "../../src/popup/lib/utils";

describe("cn", () => {
    it("joins truthy class names", () => {
        expect(cn("a", "b")).toBe("a b");
    });

    it("drops falsey values", () => {
        expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
    });

    it("merges conflicting tailwind utilities keeping the last", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("supports conditional object syntax", () => {
        expect(cn({ active: true, disabled: false })).toBe("active");
    });
});
