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

import { utf8Bytes } from "../helpers/fixtures";

describe("isBytes", () => {
    it("recognises a typed array regardless of which realm built it", () => {
        expect(isBytes(utf8Bytes("x"))).toBe(true);
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
        expect(isDecodedTorrent({ info: { name: utf8Bytes("x") } })).toBe(true);
    });

    it("rejects anything without a usable info dictionary", () => {
        expect(isDecodedTorrent({})).toBe(false);
        expect(isDecodedTorrent({ info: utf8Bytes("not-a-dict") })).toBe(false);
        expect(isDecodedTorrent({ info: [1, 2] })).toBe(false);
        expect(isDecodedTorrent(null)).toBe(false);
        expect(isDecodedTorrent("<html>nope</html>")).toBe(false);
    });
});

describe("isBencodeDictionary", () => {
    it("distinguishes dictionaries from the other three bencode types", () => {
        expect(isBencodeDictionary({ a: 1 })).toBe(true);
        expect(isBencodeDictionary([1])).toBe(false);
        expect(isBencodeDictionary(utf8Bytes("x"))).toBe(false);
        expect(isBencodeDictionary(3)).toBe(false);
        expect(isBencodeDictionary(undefined)).toBe(false);
    });
});

describe("value accessors", () => {
    it("toText decodes byte strings and rejects everything else", () => {
        expect(toText(utf8Bytes("hello"))).toBe("hello");
        expect(toText(5)).toBeUndefined();
        expect(toText([])).toBeUndefined();
        expect(toText(undefined)).toBeUndefined();
    });

    it("toList passes lists through and flattens everything else to empty", () => {
        expect(toList([1, 2])).toEqual([1, 2]);
        expect(toList(utf8Bytes("x"))).toEqual([]);
        expect(toList(undefined)).toEqual([]);
    });

    it("toInteger only accepts numbers", () => {
        expect(toInteger(0)).toBe(0);
        expect(toInteger(1)).toBe(1);
        expect(toInteger(utf8Bytes("1"))).toBeUndefined();
        expect(toInteger(undefined)).toBeUndefined();
    });

    it("toInfo reads a well-formed info dictionary and rejects a malformed one", () => {
        expect(toInfo({ info: { name: utf8Bytes("x") } })).toEqual({ name: utf8Bytes("x") });
        expect(toInfo({ info: utf8Bytes("x") })).toBeUndefined();
        expect(toInfo({})).toBeUndefined();
        expect(toInfo(null)).toBeUndefined();
    });
});
