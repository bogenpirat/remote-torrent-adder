import { describe, it, expect, vi } from "vitest";
import { blobToBase64 } from "../../src/util/converter";

describe("blobToBase64", () => {
    it("encodes blob contents as base64 without the data-url prefix", async () => {
        const blob = new Blob([new Uint8Array([102, 111, 111])]); // "foo"
        expect(await blobToBase64(blob)).toBe("Zm9v");
    });

    it("encodes an empty blob to an empty string", async () => {
        expect(await blobToBase64(new Blob([]))).toBe("");
    });

    it("rejects with the reader's own error when the blob cannot be read", async () => {
        const failure = new DOMException("Node was not found", "NotFoundError");
        const reader = {
            error: failure,
            result: null as string | null,
            onload: null as (() => void) | null,
            onerror: null as (() => void) | null,
            readAsDataURL() {
                queueMicrotask(() => {
                    this.onerror?.();
                    (this as unknown as { onloadend?: () => void }).onloadend?.();
                });
            },
        };
        vi.stubGlobal("FileReader", function FakeFileReader() { return reader; });

        await expect(blobToBase64(new Blob([new Uint8Array([1])]))).rejects.toBe(failure);

        vi.unstubAllGlobals();
    });
});
