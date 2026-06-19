import { describe, it, expect } from "vitest";
import { convertToBinary, convertBlobToString, blobToBase64 } from "../../src/util/converter";

describe("convertToBinary", () => {
    it("maps each character to its byte value", () => {
        const result = convertToBinary("ABC");
        expect(Array.from(result)).toEqual([65, 66, 67]);
    });

    it("masks code points to the low byte", () => {
        // 0x100 & 0xff === 0
        const result = convertToBinary("Ā");
        expect(Array.from(result)).toEqual([0]);
    });

    it("returns an empty Uint8Array for an empty string", () => {
        expect(Array.from(convertToBinary(""))).toEqual([]);
    });
});

describe("convertBlobToString", () => {
    it("round-trips bytes to a binary string", async () => {
        const blob = new Blob([new Uint8Array([72, 105])]);
        expect(await convertBlobToString(blob)).toBe("Hi");
    });

    it("handles blobs larger than the 0x8000 chunk size", async () => {
        const size = 0x8000 + 10;
        const bytes = new Uint8Array(size).fill(65);
        const blob = new Blob([bytes]);
        const result = await convertBlobToString(blob);
        expect(result.length).toBe(size);
        expect(result).toBe("A".repeat(size));
    });
});

describe("blobToBase64", () => {
    it("encodes blob contents as base64 without the data-url prefix", async () => {
        const blob = new Blob([new Uint8Array([102, 111, 111])]); // "foo"
        expect(await blobToBase64(blob)).toBe("Zm9v");
    });

    it("encodes an empty blob to an empty string", async () => {
        expect(await blobToBase64(new Blob([]))).toBe("");
    });
});
