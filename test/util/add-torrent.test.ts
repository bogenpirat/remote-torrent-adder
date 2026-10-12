import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadTorrent, showNotification } from "../helpers/add-flow-mocks";
import { callArgs } from "../helpers/assert";

import { dispatchPreAddTorrent } from "../../src/util/add-torrent";
import { PreAddTorrentMessage } from "../../src/models/messages";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { findBufferedTorrent, readBufferedTorrent } from "../../src/util/buffered-torrent";
import { CloudflareChallengeError, type TorrentDownloadContext } from "../../src/util/download";
import { Settings } from "../../src/util/settings";
import { HttpError } from "../../src/models/webui-http";
import { MAGNET_URL, SEEDED_WEBUI_ID, TRACKER_URL, seedSingleWebUi, settle, stubClientAccepts } from "../helpers/add-flow";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";
import { makeMagnetTorrent, seedWebUISettings } from "../helpers/fixtures";

const WEBUI_URL = "http://example.com:8080/";
const WINDOW_ID = 7;

async function preAdd(url: string = MAGNET_URL, context: TorrentDownloadContext = {}): Promise<void> {
    const message = { action: PreAddTorrentMessage.action, url, webUiId: SEEDED_WEBUI_ID };
    await dispatchPreAddTorrent({ message, windowId: WINDOW_ID, context }, await new Settings().loadSettings());
    await settle();
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

    it("logs which WebUI was missing without the torrent URL", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedWebUISettings([]);

        await preAdd(TRACKER_URL);

        expect(consoleError).toHaveBeenCalledWith(`No WebUI found for id "${SEEDED_WEBUI_ID}".`);
    });
});

describe("dispatchPreAddTorrent with the per-torrent selector", () => {
    beforeEach(() => seedSingleWebUi({ showPerTorrentConfigSelector: true }));

    it("notifies instead of opening the popup when the download fails", async () => {
        downloadTorrent.mockRejectedValue(new CloudflareChallengeError(TRACKER_URL));

        await preAdd(TRACKER_URL);

        expect(shownNotification()).toMatchObject({ title: "Cloudflare is blocking this download", webUiUrl: TRACKER_URL });
        expect(chrome.action.openPopup).not.toHaveBeenCalled();
        expect(await findBufferedTorrent()).toBeUndefined();
    });

    it("points a plain download failure at the WebUI", async () => {
        downloadTorrent.mockRejectedValue(new Error("network down"));

        await preAdd(TRACKER_URL);

        expect(shownNotification()).toEqual({
            title: "Error downloading torrent",
            message: "Error: network down",
            isFailed: true,
            webUiUrl: WEBUI_URL,
        });
    });

    it("focuses the window and opens the action popup", async () => {
        await preAdd();

        expect(downloadTorrent).toHaveBeenCalled();
        expect(chrome.windows.update).toHaveBeenCalledWith(WINDOW_ID, { focused: true });
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
        expect(buffered.torrent.data).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(buffered.webUiSettings.id).toBe(SEEDED_WEBUI_ID);
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

    it("reports the status and body of an HTTP error thrown while sending", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedSingleWebUi();
        vi.spyOn(QBittorrentWebUI.prototype, "sendTorrent").mockRejectedValue(new HttpError(502, "boom"));

        await preAdd();

        expect(shownNotification()).toMatchObject({ title: "Torrent adding failed", message: "Error (502):\nboom", isFailed: true });
    });

    it("reports the message of an error that carries no HTTP response", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedSingleWebUi();
        vi.spyOn(QBittorrentWebUI.prototype, "sendTorrent").mockRejectedValue(new Error("connection reset"));

        await preAdd();

        expect(shownNotification()).toMatchObject({ title: "Torrent adding failed", message: "Error: connection reset" });
    });

    it("does not log a refused torrent as sent", async () => {
        const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
        seedSingleWebUi();
        queueFetch(mockResponse({ status: 500, body: "nope" }));

        await preAdd();

        expect(consoleLog).not.toHaveBeenCalledWith(expect.stringContaining("Torrent sent successfully"));
    });

    it("logs a refused torrent even when notifications are disabled", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedSingleWebUi({}, { notificationsEnabled: false });
        queueFetch(mockResponse({ status: 500, body: "nope" }));

        await preAdd();

        expect(consoleError).toHaveBeenCalledWith("My Client refused Cool Torrent:", "HTTP Response code: 500\nResponse body: nope");
        expect(showNotification).not.toHaveBeenCalled();
    });

    it("reads the settings only once for a whole add", async () => {
        seedSingleWebUi();
        stubClientAccepts();

        await preAdd();

        expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
    });

    it("logs which WebUI a torrent could not be added to when the failure cannot be shown", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedSingleWebUi();
        downloadTorrent.mockRejectedValue(new Error("network down"));
        showNotification.mockImplementationOnce(() => {
            throw new Error("notifications unavailable");
        });

        await preAdd();

        expect(consoleError).toHaveBeenCalledWith(
            "Failed adding a torrent to My Client:",
            expect.objectContaining({ message: "notifications unavailable" }),
        );
    });

    it("stays silent about results when notifications are disabled", async () => {
        seedSingleWebUi({}, { notificationsEnabled: false });
        stubClientAccepts();

        await preAdd();

        expect(showNotification).not.toHaveBeenCalled();
    });

    it("still reports a thrown error when notifications are disabled", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedSingleWebUi({}, { notificationsEnabled: false });
        vi.spyOn(QBittorrentWebUI.prototype, "sendTorrent").mockRejectedValue(new HttpError(502, "boom"));

        await preAdd();

        expect(shownNotification().title).toBe("Torrent adding failed");
    });
});
