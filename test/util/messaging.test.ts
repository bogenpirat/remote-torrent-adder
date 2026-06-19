import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the heavy collaborators so the dispatcher can be exercised in isolation.
const { showNotification, downloadTorrent } = vi.hoisted(() => ({
    showNotification: vi.fn(),
    downloadTorrent: vi.fn(),
}));
vi.mock("../../src/util/notifications", () => ({ showNotification }));
vi.mock("../../src/util/download", () => ({ downloadTorrent }));

import { registerMessageListener, dispatchPreAddTorrent } from "../../src/util/messaging";
import {
    GetSettingsMessage,
    SaveSettingsMessage,
    TestNotificationMessage,
    PreAddTorrentMessage,
    AddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    GetPreAddedTorrentAndSettings,
} from "../../src/models/messages";
import { serializeSettings, deserializeSettings } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { Client } from "../../src/models/clients";
import { makeWebUISettings, makeMagnetTorrent } from "../helpers/fixtures";

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

    it("responds with an error for GetPreAddedTorrentAndSettings when nothing is buffered", async () => {
        expect(await dispatch({ action: GetPreAddedTorrentAndSettings.action })).toEqual({
            error: "no buffered torrent",
        });
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

        expect(downloadTorrent).toHaveBeenCalledWith("magnet:?x");
        expect(showNotification).toHaveBeenCalled();
        expect(showNotification.mock.calls[0][0]).toBe("Torrent added successfully");
    });

    it("notifies the user when downloading the torrent fails", async () => {
        seedWebUi();
        downloadTorrent.mockRejectedValue(new Error("network down"));

        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "magnet:?x", config: {} });
        await new Promise((r) => setTimeout(r, 0));

        expect(showNotification).toHaveBeenCalled();
        expect(showNotification.mock.calls[0][0]).toBe("Error downloading torrent");
    });

    it("persists updated labels and dirs for AddTorrentMessageWithLabelAndDir", async () => {
        seedWebUi();
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );

        await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: {},
            serializedTorrent: { data: "magnet:?x", name: "n", isMagnet: true },
            labels: ["movies", "tv"],
            directories: ["/data"],
        });
        await new Promise((r) => setTimeout(r, 0));

        const persisted = deserializeSettings((chrome as any).__storage.settings)!;
        expect(persisted.webuiSettings[0].labels).toEqual(["movies", "tv"]);
        expect(persisted.webuiSettings[0].dirs).toEqual(["/data"]);
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

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 1);
        await new Promise((r) => setTimeout(r, 0));

        expect(downloadTorrent).toHaveBeenCalledWith("magnet:?x");
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
});
