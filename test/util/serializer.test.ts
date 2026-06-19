import { describe, it, expect } from "vitest";
import {
    serializeSettings,
    deserializeSettings,
    serializeObject,
    deserializeObject,
    convertTorrentToSerialized,
    convertSerializedToTorrent,
} from "../../src/util/serializer";
import { RTASettings } from "../../src/models/settings";
import { makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";

describe("serializeObject / deserializeObject", () => {
    it("preserves RegExp values across a round-trip", () => {
        const obj = { pattern: /foo.*bar/gi, plain: "x" };
        const restored = deserializeObject(serializeObject(obj));
        expect(restored.pattern).toBeInstanceOf(RegExp);
        expect(restored.pattern.source).toBe("foo.*bar");
        expect(restored.pattern.flags).toBe("gi");
        expect(restored.plain).toBe("x");
    });

    it("returns null when deserializing an empty string", () => {
        expect(deserializeObject("")).toBeNull();
    });

    it("round-trips nested plain objects", () => {
        const obj = { a: 1, b: { c: [1, 2, 3] } };
        expect(deserializeObject(serializeObject(obj))).toEqual(obj);
    });
});

describe("serializeSettings / deserializeSettings", () => {
    it("round-trips settings including link-catching regexes", () => {
        const settings: RTASettings = {
            notificationsEnabled: true,
            notificationsDurationMs: 2000,
            notificationsSoundEnabled: false,
            linkCatchingEnabled: true,
            linkCatchingRegexes: [/\.torrent\b/, /action=download/],
            webuiSettings: [],
        };
        const restored = deserializeSettings(serializeSettings(settings))!;
        expect(restored.notificationsDurationMs).toBe(2000);
        expect(restored.linkCatchingRegexes[0]).toBeInstanceOf(RegExp);
        expect(restored.linkCatchingRegexes[0].source).toBe("\\.torrent\\b");
        expect(restored.linkCatchingRegexes[1].source).toBe("action=download");
    });

    it("returns null for empty input", () => {
        expect(deserializeSettings("")).toBeNull();
    });
});

describe("convertTorrentToSerialized", () => {
    it("keeps magnet data as the raw string", async () => {
        const torrent = makeMagnetTorrent();
        const serialized = await convertTorrentToSerialized(torrent);
        expect(serialized.data).toBe(torrent.data);
        expect(serialized.isMagnet).toBe(true);
    });

    it("base64-encodes file torrent blob data", async () => {
        const torrent = makeFileTorrent({
            data: new Blob([new Uint8Array([102, 111, 111])]), // "foo"
        });
        const serialized = await convertTorrentToSerialized(torrent);
        expect(serialized.data).toBe("Zm9v");
        expect(serialized.isMagnet).toBe(false);
    });
});

describe("convertSerializedToTorrent", () => {
    it("keeps magnet data as a string", () => {
        const torrent = convertSerializedToTorrent({
            data: "magnet:?xt=urn:btih:abc",
            name: "x",
            isMagnet: true,
        });
        expect(torrent.data).toBe("magnet:?xt=urn:btih:abc");
    });

    it("decodes base64 file data back to a Blob", async () => {
        const torrent = convertSerializedToTorrent({
            data: "Zm9v",
            name: "x.torrent",
            isMagnet: false,
        });
        expect(torrent.data).toBeInstanceOf(Blob);
        const text = await (torrent.data as Blob).text();
        expect(text).toBe("foo");
    });

    it("round-trips a file torrent through serialize and back", async () => {
        const original = makeFileTorrent({ data: new Blob([new Uint8Array([1, 2, 3, 250])]) });
        const serialized = await convertTorrentToSerialized(original);
        const restored = convertSerializedToTorrent(serialized);
        const bytes = new Uint8Array(await (restored.data as Blob).arrayBuffer());
        expect(Array.from(bytes)).toEqual([1, 2, 3, 250]);
    });
});
