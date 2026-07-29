// @vitest-environment node
//
// fake-indexeddb round-trips values through structuredClone, which cannot
// serialize a jsdom Blob (it comes back as {}). Node's own Blob clones
// correctly, so this file runs in the node environment to exercise the real
// store-and-read path that Chrome performs natively.

import { describe, it, expect } from "vitest";
import { clearBufferedTorrent, readBufferedTorrent, saveBufferedTorrent } from "../../src/util/buffered-torrent";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";

describe("buffered torrent store", () => {
    it("returns null when nothing has been buffered", async () => {
        expect(await readBufferedTorrent()).toBeNull();
    });

    it("round-trips a magnet torrent", async () => {
        await saveBufferedTorrent({ torrent: makeMagnetTorrent(), webUiSettings: makeWebUISettings({ id: "w1" }) });

        const buffered = await readBufferedTorrent();
        expect(buffered!.torrent.isMagnet).toBe(true);
        expect(buffered!.torrent.data).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(buffered!.webUiSettings.id).toBe("w1");
    });

    it("keeps a .torrent payload as a Blob instead of encoding it", async () => {
        const torrent = makeFileTorrent({ name: "ubuntu.torrent" });
        await saveBufferedTorrent({ torrent, webUiSettings: makeWebUISettings() });

        const buffered = await readBufferedTorrent();
        expect(buffered!.torrent.data).toBeInstanceOf(Blob);
        expect(buffered!.torrent.name).toBe("ubuntu.torrent");
        const bytes = new Uint8Array(await (buffered!.torrent.data as Blob).arrayBuffer());
        expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
    });

    it("holds a payload far larger than the chrome.storage.session quota", async () => {
        // 12MB: over the 10MB session quota, and over it again once base64 would
        // have inflated it by a third. IndexedDB stores the bytes as they are.
        const size = 12 * 1024 * 1024;
        const torrent = makeFileTorrent({ data: new Blob([new Uint8Array(size)]) });

        await saveBufferedTorrent({ torrent, webUiSettings: makeWebUISettings() });

        const buffered = await readBufferedTorrent();
        expect((buffered!.torrent.data as Blob).size).toBe(size);
    });

    it("replaces the previous entry rather than accumulating", async () => {
        await saveBufferedTorrent({ torrent: makeMagnetTorrent({ name: "first" }), webUiSettings: makeWebUISettings() });
        await saveBufferedTorrent({ torrent: makeMagnetTorrent({ name: "second" }), webUiSettings: makeWebUISettings() });

        expect((await readBufferedTorrent())!.torrent.name).toBe("second");
    });

    it("clears the entry", async () => {
        await saveBufferedTorrent({ torrent: makeMagnetTorrent(), webUiSettings: makeWebUISettings() });
        await clearBufferedTorrent();

        expect(await readBufferedTorrent()).toBeNull();
    });

    it("tolerates clearing when nothing is buffered", async () => {
        await expect(clearBufferedTorrent()).resolves.toBeUndefined();
    });
});
