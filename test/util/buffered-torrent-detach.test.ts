
import { describe, it, expect, vi, beforeEach } from "vitest";

const { withStore } = vi.hoisted(() => ({ withStore: vi.fn() }));
vi.mock("../../src/util/idb", () => ({ withStore }));

import { readBufferedTorrent } from "../../src/util/buffered-torrent";
import { makeWebUISettings, makeFileTorrent, makeMagnetTorrent } from "../helpers/fixtures";

describe("readBufferedTorrent detaching the payload", () => {
    beforeEach(() => {
        withStore.mockReset();
    });

    it("copies the bytes out of the stored Blob", async () => {
        const stored = new Blob([new Uint8Array([9, 8, 7])], { type: "application/x-bittorrent" });
        const arrayBuffer = vi.spyOn(stored, "arrayBuffer");
        withStore.mockResolvedValue({
            torrent: makeFileTorrent({ data: stored }),
            webUiSettings: makeWebUISettings(),
        });

        const buffered = await readBufferedTorrent();

        expect(arrayBuffer).toHaveBeenCalled();
        expect(buffered!.torrent.data).not.toBe(stored);
        expect(buffered!.torrent.data).toBeInstanceOf(Blob);
        const bytes = new Uint8Array(await (buffered!.torrent.data as Blob).arrayBuffer());
        expect(Array.from(bytes)).toEqual([9, 8, 7]);
        expect((buffered!.torrent.data as Blob).type).toBe("application/x-bittorrent");
    });

    it("leaves a magnet payload untouched", async () => {
        const torrent = makeMagnetTorrent();
        withStore.mockResolvedValue({ torrent, webUiSettings: makeWebUISettings() });

        const buffered = await readBufferedTorrent();

        expect(buffered!.torrent.data).toBe(torrent.data);
    });

    it("still returns null when nothing is buffered", async () => {
        withStore.mockResolvedValue(undefined);

        expect(await readBufferedTorrent()).toBeNull();
    });
});
