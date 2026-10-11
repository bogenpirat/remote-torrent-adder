import { describe, it, expect, vi, beforeEach } from "vitest";
import { callArgs } from "../helpers/assert";

const { showNotification, downloadTorrent } = vi.hoisted(() => ({
    showNotification: vi.fn(),
    downloadTorrent: vi.fn(),
}));
vi.mock("../../src/util/notifications", () => ({ showNotification }));
vi.mock("../../src/util/download", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    downloadTorrent,
}));

import { dispatchPreAddTorrent } from "../../src/util/add-torrent";
import { PreAddTorrentMessage } from "../../src/models/messages";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { readBufferedTorrent } from "../../src/util/buffered-torrent";
import { CloudflareChallengeError, type TorrentDownloadContext } from "../../src/util/download";
import { seedSingleWebUi, settle, stubClientAccepts } from "../helpers/add-flow";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";
import { makeMagnetTorrent, seedWebUISettings } from "../helpers/fixtures";

const MAGNET_URL = "magnet:?x";
const TRACKER_URL = "https://tracker.org/get/1.torrent";
const WEBUI_URL = "http://example.com:8080/";
const SEND_ERROR = { httpResponseCode: 502, httpResponseBody: "boom" };

function preAdd(url: string = MAGNET_URL, context?: TorrentDownloadContext): Promise<void> {
    const message = { action: PreAddTorrentMessage.action, url, webUiId: "w1" };
    return dispatchPreAddTorrent(message, 7, context).then(settle);
}

function shownNotification(index = 0) {
    const { title, message, isFailed, webUiUrl } = callArgs(showNotification, index)[0];
    return { title, message, isFailed, webUiUrl };
}

beforeEach(() => {
    showNotification.mockClear();
    downloadTorrent.mockReset();
    downloadTorrent.mockResolvedValue(makeMagnetTorrent());
});

describe("dispatchPreAddTorrent without the per-torrent selector", () => {
    it("downloads the torrent with the context it was given", async () => {
        seedSingleWebUi();
        stubClientAccepts();
        const context = { tabId: 4, frameId: 0, pageUrl: "https://tracker.org/browse" };

        await preAdd(MAGNET_URL, context);

        expect(downloadTorrent).toHaveBeenCalledWith(MAGNET_URL, context);
    });

    it("applies a torrent-name auto-label rule", async () => {
        const autoLabelRule = { criteria: [{ field: "torrentName" as const, value: "cool" }], label: "auto-movies", dir: null };
        seedSingleWebUi({ defaultLabel: "fallback", autoLabelDirSettings: [autoLabelRule] });
        const fetchMock = stubClientAccepts();

        await preAdd();

        const uploadCall = (fetchMock.mock.calls as any[][]).find(call => String(call[0]).includes("/torrents/add"));
        expect((uploadCall![1].body as FormData).get("category")).toBe("auto-movies");
    });

    it("tells the user when no WebUI is configured at all", async () => {
        seedWebUISettings([]);

        await preAdd();

        expect(shownNotification()).toMatchObject({ title: "No WebUI configured", message: "Check your settings.", isFailed: true });
        expect(downloadTorrent).not.toHaveBeenCalled();
    });
});

describe("dispatchPreAddTorrent with the per-torrent selector", () => {
    beforeEach(() => seedSingleWebUi({ showPerTorrentConfigSelector: true }));

    it("notifies instead of opening the popup when the download fails", async () => {
        downloadTorrent.mockRejectedValue(new CloudflareChallengeError(TRACKER_URL));

        await preAdd(TRACKER_URL);

        expect(shownNotification()).toMatchObject({ title: "Cloudflare is blocking this download", webUiUrl: TRACKER_URL });
        expect(chrome.action.openPopup).not.toHaveBeenCalled();
        expect(await readBufferedTorrent()).toBeNull();
    });

    it("points a plain download failure at the WebUI", async () => {
        downloadTorrent.mockRejectedValue(new Error("network down"));

        await preAdd(TRACKER_URL);

        expect(shownNotification()).toEqual({
            title: "Error downloading torrent",
            message: "Error: Error: network down",
            isFailed: true,
            webUiUrl: WEBUI_URL,
        });
    });

    it("buffers the torrent and opens the action popup", async () => {
        await preAdd();

        expect(downloadTorrent).toHaveBeenCalled();
        expect(chrome.windows.update).toHaveBeenCalledWith(7, { focused: true });
        expect(chrome.action.openPopup).toHaveBeenCalled();
    });

    it("falls back to a popup window when the action popup cannot be opened", async () => {
        (chrome.action.openPopup as any).mockRejectedValue(new Error("openPopup requires a user gesture"));

        await preAdd();

        expect(chrome.windows.create).toHaveBeenCalledWith(expect.objectContaining({ url: "popup/popup.html", type: "popup" }));
        expect(chrome.action.setPopup).toHaveBeenLastCalledWith({ popup: "" });
    });

    it("uses a popup window directly when the alternative chooser is enabled", async () => {
        seedSingleWebUi({ showPerTorrentConfigSelector: true, useAlternativeLabelDirChooser: true });

        await preAdd();

        expect(chrome.action.openPopup).not.toHaveBeenCalled();
        expect(chrome.windows.create).toHaveBeenCalled();
    });

    it("parks the buffered torrent in IndexedDB so the popup can read it directly", async () => {
        await preAdd();

        const buffered = await readBufferedTorrent();
        expect(buffered!.torrent.data).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(buffered!.webUiSettings.id).toBe("w1");
    });
});

describe("notifications after handing the torrent to the client", () => {
    it("reports a successful add and links to the WebUI", async () => {
        seedSingleWebUi();
        stubClientAccepts();

        await preAdd();

        expect(shownNotification()).toEqual({
            title: "Torrent added successfully",
            message: "Cool Torrent successfully added to My Client",
            isFailed: false,
            webUiUrl: WEBUI_URL,
        });
    });

    it("reports the HTTP status and body when the client refuses the torrent", async () => {
        seedSingleWebUi();
        queueFetch(mockResponse({ status: 500, body: "nope" }));

        await preAdd();

        expect(shownNotification()).toEqual({
            title: "Torrent adding failed",
            message: "HTTP Response code: 500\nResponse body: nope",
            isFailed: true,
            webUiUrl: WEBUI_URL,
        });
    });

    it("reports the error when sending the torrent throws", async () => {
        seedSingleWebUi();
        vi.spyOn(QBittorrentWebUI.prototype, "sendTorrent").mockRejectedValue(SEND_ERROR);

        await preAdd();

        expect(shownNotification()).toMatchObject({ title: "Torrent adding failed", message: "Error (502):\nboom", isFailed: true });
    });

    it("stays silent about results when notifications are disabled", async () => {
        seedSingleWebUi({}, { notificationsEnabled: false });
        stubClientAccepts();

        await preAdd();

        expect(showNotification).not.toHaveBeenCalled();
    });

    it("still reports a thrown error when notifications are disabled", async () => {
        seedSingleWebUi({}, { notificationsEnabled: false });
        vi.spyOn(QBittorrentWebUI.prototype, "sendTorrent").mockRejectedValue(SEND_ERROR);

        await preAdd();

        expect(shownNotification().title).toBe("Torrent adding failed");
    });
});
