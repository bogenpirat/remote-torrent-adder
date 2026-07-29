import { describe, it, expect } from "vitest";
import {
    isBencodeDictionary,
    isBytes,
    isDecodedTorrent,
    toInfo,
    toInteger,
    toList,
    toText,
} from "../../src/models/decoded-torrent";

const enc = (s: string) => new TextEncoder().encode(s);

describe("isBytes", () => {
    it("recognises a typed array regardless of which realm built it", () => {
        expect(isBytes(enc("x"))).toBe(true);
        expect(isBytes(new Uint8Array([1, 2]))).toBe(true);
        // Buffer is a Uint8Array subclass from another realm under the runner
        expect(isBytes(Buffer.from("x"))).toBe(true);
    });

    it("rejects non-byte values", () => {
        expect(isBytes("x")).toBe(false);
        expect(isBytes(7)).toBe(false);
        expect(isBytes([1, 2])).toBe(false);
        expect(isBytes({})).toBe(false);
        expect(isBytes(new DataView(new ArrayBuffer(2)))).toBe(false);
    });
});

describe("isDecodedTorrent", () => {
    it("accepts a dictionary carrying an info dictionary", () => {
        expect(isDecodedTorrent({ info: { name: enc("x") } })).toBe(true);
    });

    it("rejects anything without a usable info dictionary", () => {
        expect(isDecodedTorrent({})).toBe(false);
        expect(isDecodedTorrent({ info: enc("not-a-dict") })).toBe(false);
        expect(isDecodedTorrent({ info: [1, 2] })).toBe(false);
        expect(isDecodedTorrent(null)).toBe(false);
        expect(isDecodedTorrent("<html>nope</html>")).toBe(false);
    });
});

describe("isBencodeDictionary", () => {
    it("distinguishes dictionaries from the other three bencode types", () => {
        expect(isBencodeDictionary({ a: 1 })).toBe(true);
        expect(isBencodeDictionary([1])).toBe(false);
        expect(isBencodeDictionary(enc("x"))).toBe(false);
        expect(isBencodeDictionary(3)).toBe(false);
        expect(isBencodeDictionary(undefined)).toBe(false);
    });
});

describe("value accessors", () => {
    it("toText decodes byte strings and rejects everything else", () => {
        expect(toText(enc("hello"))).toBe("hello");
        expect(toText(5)).toBeNull();
        expect(toText([])).toBeNull();
        expect(toText(undefined)).toBeNull();
    });

    it("toList passes lists through and flattens everything else to empty", () => {
        expect(toList([1, 2])).toEqual([1, 2]);
        expect(toList(enc("x"))).toEqual([]);
        expect(toList(undefined)).toEqual([]);
    });

    it("toInteger only accepts numbers", () => {
        expect(toInteger(0)).toBe(0);
        expect(toInteger(1)).toBe(1);
        expect(toInteger(enc("1"))).toBeNull();
        expect(toInteger(undefined)).toBeNull();
    });

    it("toInfo reads a well-formed info dictionary and rejects a malformed one", () => {
        expect(toInfo({ info: { name: enc("x") } })).toEqual({ name: enc("x") });
        expect(toInfo({ info: enc("x") })).toBeNull();
        expect(toInfo({})).toBeNull();
        expect(toInfo(null)).toBeNull();
    });
});
