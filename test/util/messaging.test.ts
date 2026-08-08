import { describe, it, expect, vi, beforeEach } from "vitest";
import { at, callArgs } from "../helpers/assert";

// Mock the heavy collaborators so the dispatcher can be exercised in isolation.
const { showNotification, downloadTorrent } = vi.hoisted(() => ({
    showNotification: vi.fn(),
    downloadTorrent: vi.fn(),
}));
vi.mock("../../src/util/notifications", () => ({ showNotification }));
vi.mock("../../src/util/download", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    downloadTorrent,
}));

import { registerMessageListener, dispatchPreAddTorrent } from "../../src/util/messaging";
import {
    GetSettingsMessage,
    SaveSettingsMessage,
    TestNotificationMessage,
    PreAddTorrentMessage,
    AddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
} from "../../src/models/messages";
import { serializeSettings, deserializeSettings } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { Client } from "../../src/models/clients";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { readBufferedTorrent, saveBufferedTorrent } from "../../src/util/buffered-torrent";
import { CloudflareChallengeError } from "../../src/util/download";

/** Registers the listener and returns it so tests can invoke it directly. */
function getListener() {
    registerMessageListener();
    const calls = (chrome.runtime.onMessage.addListener as any).mock.calls;
    return calls[calls.length - 1][0];
}

/** Invokes the listener and resolves with the value passed to sendResponse. */
function dispatch(message: any, sender: any = {}): Promise<any> {
    const listener = getListener();
    return new Promise((resolve) => {
        const willRespondAsync = listener(message, sender, resolve);
        if (!willRespondAsync) {
            // synchronous responders already called sendResponse
        }
    });
}

beforeEach(() => {
    showNotification.mockClear();
    downloadTorrent.mockReset();
});

describe("registerMessageListener routing", () => {
    it("responds with an error when the message has no action", async () => {
        expect(await dispatch({})).toEqual({ error: "missing action" });
    });

    it("responds with an error for an unknown action", async () => {
        expect(await dispatch({ action: "nope" })).toEqual({ error: "unknown action: nope" });
    });

    it("returns serialized settings for GetSettings", async () => {
        const stored = getDefaultSettings();
        stored.notificationsDurationMs = 4321;
        (chrome as any).__storage.settings = serializeSettings(stored);

        const response = await dispatch({ action: GetSettingsMessage.action });
        expect(deserializeSettings(response)!.notificationsDurationMs).toBe(4321);
    });

    it("persists settings for SaveSettings", async () => {
        const toSave = getDefaultSettings();
        toSave.notificationsSoundEnabled = true;
        const response = await dispatch({
            action: SaveSettingsMessage.action,
            settings: serializeSettings(toSave),
        });
        expect(response).toEqual({});
        expect(deserializeSettings((chrome as any).__storage.settings)!.notificationsSoundEnabled).toBe(true);
    });

    it("shows a notification for TestNotification", async () => {
        await dispatch({
            action: TestNotificationMessage.action,
            title: "T",
            message: "M",
            isFailed: false,
            popupDurationMs: 1000,
            playSound: false,
        });
        expect(showNotification).toHaveBeenCalledWith("T", "M", false, 1000, false);
    });

});

describe("AddTorrent flow", () => {
    function seedWebUi(over = {}) {
        const settings = getDefaultSettings();
        settings.webuiSettings = [makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, host: "h", port: 8080, ...over })];
        (chrome as any).__storage.settings = serializeSettings(settings);
    }

    it("downloads and sends the torrent, then shows a success notification", async () => {
        seedWebUi();
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        // qBittorrent: auth then add, both ok
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );

        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "magnet:?x", config: {} });
        await new Promise((r) => setTimeout(r, 0));

        expect(downloadTorrent).toHaveBeenCalledWith("magnet:?x", { tabId: null, frameId: 0, pageUrl: null });
        expect(showNotification).toHaveBeenCalled();
        expect(callArgs(showNotification, 0)[0]).toBe("Torrent added successfully");
    });

    it("notifies the user when downloading the torrent fails", async () => {
        seedWebUi();
        downloadTorrent.mockRejectedValue(new Error("network down"));

        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "magnet:?x", config: {} });
        await new Promise((r) => setTimeout(r, 0));

        expect(showNotification).toHaveBeenCalled();
        expect(callArgs(showNotification, 0)[0]).toBe("Error downloading torrent");
    });

    it("hands the download over to the tab the link was clicked in", async () => {
        seedWebUi();
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );

        await dispatch(
            { action: AddTorrentMessage.action, webUiId: "w1", url: "https://tracker.org/get/1.torrent", config: {} },
            { tab: { id: 9, windowId: 1, url: "https://tracker.org/browse" }, frameId: 3 },
        );
        await new Promise((r) => setTimeout(r, 0));

        expect(downloadTorrent).toHaveBeenCalledWith("https://tracker.org/get/1.torrent", {
            tabId: 9,
            frameId: 3,
            pageUrl: "https://tracker.org/browse",
        });
    });

    it("points the notification at the tracker when Cloudflare challenges the download", async () => {
        seedWebUi();
        downloadTorrent.mockRejectedValue(new CloudflareChallengeError("https://tracker.org/get/1.torrent"));

        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "https://tracker.org/get/1.torrent", config: {} });
        await new Promise((r) => setTimeout(r, 0));

        expect(callArgs(showNotification, 0)[0]).toBe("Cloudflare is blocking this download");
        expect(callArgs(showNotification, 0)[5]).toBe("https://tracker.org/get/1.torrent");
    });

    it("persists updated labels and dirs for AddTorrentMessageWithLabelAndDir", async () => {
        seedWebUi();
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );
        await saveBufferedTorrent({
            torrent: makeMagnetTorrent(),
            webUiSettings: makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI }),
        });

        await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: {},
            labels: ["movies", "tv"],
            directories: ["/data"],
        });
        await new Promise((r) => setTimeout(r, 0));

        const persisted = deserializeSettings((chrome as any).__storage.settings)!;
        expect(at(persisted.webuiSettings, 0).labels).toEqual(["movies", "tv"]);
        expect(at(persisted.webuiSettings, 0).dirs).toEqual(["/data"]);
    });

    it("takes the torrent from IndexedDB rather than from the message", async () => {
        seedWebUi();
        const fetchMock = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );
        (globalThis as any).fetch = fetchMock;
        await saveBufferedTorrent({
            torrent: makeFileTorrent({ name: "parked.torrent" }),
            webUiSettings: makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI }),
        });

        await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: { label: "movies" },
            labels: [],
            directories: [],
        });
        await new Promise((r) => setTimeout(r, 0));

        const uploadCall = (fetchMock.mock.calls as any[][]).find(call => String(call[0]).includes("/torrents/add"));
        expect(uploadCall).toBeDefined();
        const body = uploadCall![1].body as FormData;
        expect((body.get("torrents") as File).name).toBe("parked.torrent");
        expect(body.get("category")).toBe("movies");
    });

    it("clears the buffered torrent once it has been handed to the client", async () => {
        seedWebUi();
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );
        await saveBufferedTorrent({
            torrent: makeMagnetTorrent(),
            webUiSettings: makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI }),
        });

        await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: {},
            labels: [],
            directories: [],
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(await readBufferedTorrent()).toBeNull();
    });

    it("reports an error when the popup adds with nothing buffered", async () => {
        seedWebUi();

        const response = await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: {},
            labels: [],
            directories: [],
        });

        expect(response.error).toMatch(/No buffered torrent/i);
    });
});

describe("dispatchPreAddTorrent", () => {
    it("downloads and adds directly when no per-torrent selector is configured", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: false }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );

        await dispatchPreAddTorrent(
            { action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" },
            1,
            { tabId: 4, frameId: 0, pageUrl: "https://tracker.org/browse" },
        );
        await new Promise((r) => setTimeout(r, 0));

        expect(downloadTorrent).toHaveBeenCalledWith("magnet:?x", { tabId: 4, frameId: 0, pageUrl: "https://tracker.org/browse" });
    });

    it("notifies instead of opening the popup when the download fails", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: true }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockRejectedValue(new CloudflareChallengeError("https://tracker.org/get/1.torrent"));

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "https://tracker.org/get/1.torrent", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        expect(callArgs(showNotification, 0)[0]).toBe("Cloudflare is blocking this download");
        expect(chrome.action.openPopup).not.toHaveBeenCalled();
        expect(await readBufferedTorrent()).toBeNull();
    });

    it("buffers the torrent and opens the popup when the selector is enabled", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: true }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        expect(downloadTorrent).toHaveBeenCalled();
        expect(chrome.action.openPopup).toHaveBeenCalled();
    });

    it("parks the buffered torrent in IndexedDB so the popup can read it directly", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: true }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        const buffered = await readBufferedTorrent();
        expect(buffered!.torrent.data).toBe("magnet:?xt=urn:btih:abc123&dn=Cool+Torrent");
        expect(buffered!.webUiSettings.id).toBe("w1");
    });
});
