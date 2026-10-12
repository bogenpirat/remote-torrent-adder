import { describe, it, expect, vi, beforeEach } from "vitest";
// The shared mocks replace the heavy collaborators so the dispatcher can be exercised in isolation.
import { downloadTorrent, showNotification } from "../helpers/add-flow-mocks";
import { at, callArgs } from "../helpers/assert";

import { registerMessageListener } from "../../src/util/messaging";
import {
    GetLinkCatchingConfig,
    GetSettingsMessage,
    SaveSettingsMessage,
    TestConnectionMessage,
    TestNotificationMessage,
    PreAddTorrentMessage,
    AddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    UpdateActionBadgeText,
} from "../../src/models/messages";
import { type Client } from "../../src/models/clients";
import { serializeSettings, deserializeSettings, deserializeObject } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { MAGNET_URL, SEEDED_WEBUI_ID, TRACKER_URL, seedSingleWebUi, settle, stubClientAccepts } from "../helpers/add-flow";
import { makeWebUISettings, makeMagnetTorrent, makeFileTorrent } from "../helpers/fixtures";
import { findBufferedTorrent, saveBufferedTorrent } from "../../src/util/buffered-torrent";
import { CloudflareChallengeError } from "../../src/util/download";

const TRACKER_TAB = { tab: { id: 9, windowId: 1, url: "https://tracker.org/browse" }, frameId: 3 };
const TRACKER_TAB_CONTEXT = { tabId: 9, frameId: 3, pageUrl: "https://tracker.org/browse" };

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
        listener(message, sender, resolve);
    });
}

function storedSettings() {
    return deserializeSettings((chrome as any).__storage.settings)!;
}

function addTorrent(url: string, sender: any = {}): Promise<void> {
    return dispatch({ action: AddTorrentMessage.action, webUiId: SEEDED_WEBUI_ID, url, config: {} }, sender).then(settle);
}

function addBufferedTorrent(overrides: Record<string, unknown> = {}): Promise<any> {
    const message = { action: AddTorrentMessageWithLabelAndDir.action, webUiId: SEEDED_WEBUI_ID, config: {}, labels: [], directories: [] };
    return dispatch({ ...message, ...overrides });
}

function bufferTorrent(torrent = makeMagnetTorrent()): Promise<void> {
    return saveBufferedTorrent({ torrent, webUiSettings: makeWebUISettings({ id: SEEDED_WEBUI_ID }) });
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

describe("registerMessageListener routing", () => {
    it("responds with an error when the message has no action", async () => {
        expect(await dispatch({})).toEqual({ error: "missing action" });
    });

    it("responds with an error for an unknown action", async () => {
        expect(await dispatch({ action: "nope" })).toEqual({ error: "unknown action: nope" });
    });

    it("treats the name of a built-in object member as an unknown action", async () => {
        expect(await dispatch({ action: "constructor" })).toEqual({ error: "unknown action: constructor" });
    });

    it("returns serialized settings for GetSettings", async () => {
        const stored = getDefaultSettings();
        stored.notificationsDurationMs = 4321;
        (chrome as any).__storage.settings = serializeSettings(stored);

        const response = await dispatch({ action: GetSettingsMessage.action });
        expect(deserializeSettings(response)!.notificationsDurationMs).toBe(4321);
    });

    it("returns only the link catching settings for GetLinkCatchingConfig", async () => {
        const stored = getDefaultSettings();
        stored.linkCatchingEnabled = false;
        (chrome as any).__storage.settings = serializeSettings(stored);

        const response = await dispatch({ action: GetLinkCatchingConfig.action });

        expect(deserializeObject(response)).toEqual({
            linkCatchingEnabled: false,
            linkCatchingRegexes: stored.linkCatchingRegexes,
        });
    });

    it("persists settings for SaveSettings", async () => {
        const toSave = getDefaultSettings();
        toSave.notificationsSoundEnabled = true;
        const response = await dispatch({
            action: SaveSettingsMessage.action,
            settings: serializeSettings(toSave),
        });
        expect(response).toEqual({});
        expect(storedSettings().notificationsSoundEnabled).toBe(true);
    });

    it("answers SaveSettings with an error when the settings cannot be parsed", async () => {
        const response = await dispatch({ action: SaveSettingsMessage.action, settings: "{not json" });

        expect(response.error).toEqual(expect.any(String));
    });

    it("shows a notification for TestNotification", async () => {
        const notification = { title: "T", message: "M", isFailed: false, popupDurationMs: 1000, playSound: false };

        const response = await dispatch({ action: TestNotificationMessage.action, ...notification });

        expect(showNotification).toHaveBeenCalledWith(notification);
        expect(response).toEqual({});
    });

    it("reports an unreachable WebUI for TestConnection when no client is selected", async () => {
        const webUiSettings = makeWebUISettings({ client: "not-a-client" as Client });

        const response = await dispatch({ action: TestConnectionMessage.action, webUiSettings });

        expect(response).toEqual({
            reachable: false,
            authenticated: null,
            httpResponseCode: 0,
            message: "No client selected for this WebUI.",
        });
    });

    it("updates the badge of the sending tab without answering", () => {
        const sendResponse = vi.fn();

        const willRespondAsync = getListener()({ action: UpdateActionBadgeText.action, text: "3" }, { tab: { id: 5 } }, sendResponse);

        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "3", tabId: 5 });
        expect(willRespondAsync).toBe(false);
        expect(sendResponse).not.toHaveBeenCalled();
    });

    it("answers PreAddTorrent right away and downloads from the sending tab", async () => {
        seedSingleWebUi();
        stubClientAccepts();

        const response = await dispatch({ action: PreAddTorrentMessage.action, url: TRACKER_URL, webUiId: SEEDED_WEBUI_ID }, TRACKER_TAB);
        await settle();

        expect(response).toEqual({});
        expect(downloadTorrent).toHaveBeenCalledWith(TRACKER_URL, TRACKER_TAB_CONTEXT);
    });

    it("answers PreAddTorrent with an error when the settings cannot be loaded", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.storage.local.get as any).mockRejectedValueOnce(new Error("storage unavailable"));

        const response = await dispatch({ action: PreAddTorrentMessage.action, url: TRACKER_URL, webUiId: SEEDED_WEBUI_ID }, TRACKER_TAB);

        expect(response).toEqual({ error: "storage unavailable" });
    });
});

describe("AddTorrent flow", () => {
    beforeEach(() => {
        seedSingleWebUi();
        stubClientAccepts();
    });

    it("downloads and sends the torrent, then shows a success notification", async () => {
        await addTorrent(MAGNET_URL);

        expect(downloadTorrent).toHaveBeenCalledWith(MAGNET_URL, { tabId: null, frameId: 0, pageUrl: null });
        expect(shownNotification().title).toBe("Torrent added successfully");
    });

    it("notifies the user when downloading the torrent fails", async () => {
        downloadTorrent.mockRejectedValue(new Error("network down"));

        await addTorrent(MAGNET_URL);

        expect(shownNotification().title).toBe("Error downloading torrent");
    });

    it("hands the download over to the tab the link was clicked in", async () => {
        await addTorrent(TRACKER_URL, TRACKER_TAB);

        expect(downloadTorrent).toHaveBeenCalledWith(TRACKER_URL, TRACKER_TAB_CONTEXT);
    });

    it("points the notification at the tracker when Cloudflare challenges the download", async () => {
        downloadTorrent.mockRejectedValue(new CloudflareChallengeError(TRACKER_URL));

        await addTorrent(TRACKER_URL);

        expect(shownNotification()).toMatchObject({ title: "Cloudflare is blocking this download", webUiUrl: TRACKER_URL });
    });
});

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

    it("takes the torrent from IndexedDB rather than from the message", async () => {
        const fetchMock = stubClientAccepts();
        await bufferTorrent(makeFileTorrent({ name: "parked.torrent" }));

        await addBufferedTorrent({ config: { label: "movies" } });
        const uploadCall = await vi.waitFor(() => {
            const call = (fetchMock.mock.calls as any[][]).find(fetchCall => String(fetchCall[0]).includes("/torrents/add"));
            expect(call).toBeDefined();
            return call!;
        });
        const body = uploadCall[1].body as FormData;
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
