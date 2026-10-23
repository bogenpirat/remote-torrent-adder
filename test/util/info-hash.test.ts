import { describe, it, expect, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";
import bencode from "bencode";
import { computeInfoHash, parseInfoHashFromMagnetLink } from "../../src/util/info-hash";
import { makeFileTorrent, makeMagnetTorrent } from "../helpers/fixtures";

const HEX_HASH = "0123456789abcdef0123456789abcdef01234567";

describe("parseInfoHashFromMagnetLink", () => {
    it("reads a hex btih and lower-cases it", () => {
        expect(parseInfoHashFromMagnetLink(`magnet:?xt=urn:btih:${HEX_HASH.toUpperCase()}&dn=x`)).toBe(HEX_HASH);
    });

    it("converts a base32 btih to hex", () => {
        expect(parseInfoHashFromMagnetLink("magnet:?xt=urn:btih:AERUKZ4JVPG66AJDIVTYTK6N54ASGRLH")).toBe(HEX_HASH);
    });

    it("picks the btih among several exact topics", () => {
        expect(parseInfoHashFromMagnetLink(`magnet:?xt=urn:btmh:1220${"a".repeat(64)}&xt=urn:btih:${HEX_HASH}`)).toBe(HEX_HASH);
    });

    it("returns null for a v2-only magnet", () => {
        expect(parseInfoHashFromMagnetLink(`magnet:?xt=urn:btmh:1220${"a".repeat(64)}`)).toBeNull();
    });

    it("returns null for a malformed btih or link", () => {
        expect(parseInfoHashFromMagnetLink("magnet:?xt=urn:btih:abc123")).toBeNull();
        expect(parseInfoHashFromMagnetLink("not a url")).toBeNull();
    });
});

describe("computeInfoHash", () => {
    vi.stubGlobal("crypto", webcrypto);

    it("hashes the bencoded info dictionary of a .torrent file", async () => {
        const info = { length: 1024, name: "file.bin", "piece length": 16384, pieces: new Uint8Array(20) };
        const bytes = bencode.encode({ announce: "http://tracker.invalid/announce", info }) as Uint8Array<ArrayBuffer>;
        const expected = createHash("sha1").update(bencode.encode(info)).digest("hex");

        const torrent = makeFileTorrent({ data: new Blob([bytes], { type: "application/x-bittorrent" }) });

        expect(await computeInfoHash(torrent)).toBe(expected);
    });

    it("reads the hash of a magnet link", async () => {
        expect(await computeInfoHash(makeMagnetTorrent({ data: `magnet:?xt=urn:btih:${HEX_HASH}` }))).toBe(HEX_HASH);
    });

    it("returns null when the file is not a torrent", async () => {
        expect(await computeInfoHash(makeFileTorrent())).toBeNull();
    });
});
