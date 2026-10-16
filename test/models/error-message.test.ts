import { describe, expect, it } from "vitest";
import { messageOf } from "../../src/models/error-message";

describe("messageOf", () => {
    it("returns the message of an Error", () => {
        expect(messageOf(new Error("boom"))).toBe("boom");
    });

    it("stringifies anything else that was thrown", () => {
        expect(messageOf("plain text")).toBe("plain text");
        expect(messageOf(undefined)).toBe("undefined");
    });
});
