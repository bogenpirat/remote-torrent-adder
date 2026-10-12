import { describe, it, expect, vi, beforeEach } from "vitest";
import "../helpers/add-flow-mocks";
import { at } from "../helpers/assert";

import { AddTorrentMessageWithLabelAndDir } from "../../src/models/messages";
import { findBufferedTorrent, saveBufferedTorrent } from "../../src/util/buffered-torrent";
import { SEEDED_WEBUI_ID, seedSingleWebUi, settle, stubClientAccepts, uploadRequestBody } from "../helpers/add-flow";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { dispatch, storedSettings } from "../helpers/messaging";

function addBufferedTorrent(overrides: Record<string, unknown> = {}): Promise<any> {
    const message = { action: AddTorrentMessageWithLabelAndDir.action, webUiId: SEEDED_WEBUI_ID, config: {}, labels: [], directories: [] };
    return dispatch({ ...message, ...overrides });
}

function bufferTorrent(torrent = makeMagnetTorrent()): Promise<void> {
    return saveBufferedTorrent({ torrent, webUiSettings: makeWebUISettings({ id: SEEDED_WEBUI_ID }) });
}

describe("AddTorrentMessageWithLabelAndDir flow", () => {
    beforeEach(() => seedSingleWebUi());

    it("persists updated labels and dirs", async () => {
        stubClientAccepts();
        await bufferTorrent();

        await addBufferedTorrent({ labels: ["movies", "tv"], directories: ["/data"] });
        await settle();

        const persistedWebUi = at(storedSettings().webuiSettings, 0);
        expect(persistedWebUi.labels).toEqual(["movies", "tv"]);
        expect(persistedWebUi.dirs).toEqual(["/data"]);
    });

    it("reads the settings once for the add and the label update", async () => {
        stubClientAccepts();
        await bufferTorrent();
        vi.mocked(chrome.storage.local.get).mockClear();

        await addBufferedTorrent({ labels: ["movies"] });
        await settle();

        expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
    });

    it("takes the torrent from IndexedDB rather than from the message", async () => {
        const fetchMock = stubClientAccepts();
        await bufferTorrent(makeFileTorrent({ name: "parked.torrent" }));

        await addBufferedTorrent({ config: { label: "movies" } });
        const body = await vi.waitFor(() => uploadRequestBody(fetchMock));
        expect((body.get("torrents") as File).name).toBe("parked.torrent");
        expect(body.get("category")).toBe("movies");
    });

    it("clears the buffered torrent once it has been handed to the client", async () => {
        stubClientAccepts();
        await bufferTorrent();

        await addBufferedTorrent();
        await settle();

        expect(await findBufferedTorrent()).toBeUndefined();
    });

    it("reports an error when the popup adds with nothing buffered", async () => {
        const response = await addBufferedTorrent();

        expect(response.error).toMatch(/No buffered torrent/i);
    });

    it("reports an error when the chosen WebUI no longer exists", async () => {
        await bufferTorrent();

        const response = await addBufferedTorrent({ webUiId: "gone" });

        expect(response).toEqual({ error: "No WebUI found for id gone" });
    });

    it("reports an error when the settings cannot be loaded", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.storage.local.get as any).mockRejectedValueOnce(new Error("storage unavailable"));
        await bufferTorrent();

        const response = await addBufferedTorrent();

        expect(response).toEqual({ error: "storage unavailable" });
    });

    it("still answers the popup when the labels and dirs cannot be saved", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.storage.local.set as any).mockRejectedValueOnce(new Error("quota exceeded"));
        stubClientAccepts();
        await bufferTorrent();

        const response = await addBufferedTorrent({ labels: ["movies"] });

        expect(response).toEqual({});
        expect(consoleError).toHaveBeenCalledWith("Failed updating labels/dirs", expect.objectContaining({ message: "quota exceeded" }));
    });
});
