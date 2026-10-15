import { describe, expect, it } from "vitest";
import { isErrorReply } from "../../src/models/messages";

describe("isErrorReply", () => {
    it("recognises the reply of a failed message handler", () => {
        expect(isErrorReply({ error: "boom" })).toBe(true);
    });

    it("rejects a regular result or no reply at all", () => {
        expect(isErrorReply({ reachable: true })).toBe(false);
        expect(isErrorReply(undefined)).toBe(false);
        expect(isErrorReply(null)).toBe(false);
    });

    it("rejects an error field that is not text", () => {
        expect(isErrorReply({ error: 42 })).toBe(false);
    });
});
