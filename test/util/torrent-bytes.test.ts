import { describe, it, expect } from "vitest";
import { base64ToBytes, bytesToBase64 } from "../../src/util/torrent-bytes";

describe("torrent bytes over the message channel", () => {
    it("round-trips arbitrary binary content", () => {
        const bytes = new Uint8Array(1024);
        for (let index = 0; index < bytes.length; index++) {
            bytes[index] = index % 256;
        }

        expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    });

    it("round-trips a payload larger than one encoding chunk", () => {
        const bytes = new Uint8Array(0x8000 * 3 + 17);
        for (let index = 0; index < bytes.length; index++) {
            bytes[index] = (index * 31 + 7) % 256;
        }

        expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    });

    it("round-trips an empty payload", () => {
        expect(bytesToBase64(new Uint8Array(0))).toBe("");
        expect(base64ToBytes("")).toEqual(new Uint8Array(0));
    });
});
