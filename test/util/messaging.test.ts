import { describe, it, expect, vi, beforeEach } from "vitest";
// The shared mocks replace the heavy collaborators so the dispatcher can be exercised in isolation.
import { downloadTorrent, showNotification } from "../helpers/add-flow-mocks";

import {
    GetLinkCatchingConfig,
    GetSettingsMessage,
    SaveSettingsMessage,
    TestConnectionMessage,
    TestNotificationMessage,
    PreAddTorrentMessage,
    AddTorrentMessage,
    UpdateActionBadgeText,
} from "../../src/models/messages";
import { type Client } from "../../src/models/clients";
import { serializeSettings, deserializeSettings, deserializeObject } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import {
    MAGNET_URL, SEEDED_WEBUI_ID, TRACKER_URL, seedSingleWebUi, settle, shownNotification, stubClientAccepts,
} from "../helpers/add-flow";
import { makeWebUISettings, makeMagnetTorrent } from "../helpers/fixtures";
import { dispatch, registerAndGetListener, storedSettings } from "../helpers/messaging";
import { CloudflareChallengeError } from "../../src/util/download";

const TRACKER_TAB = { tab: { id: 9, windowId: 1, url: "https://tracker.org/browse" }, frameId: 3 };
const TRACKER_TAB_CONTEXT = { tabId: 9, frameId: 3, pageUrl: "https://tracker.org/browse" };

function addTorrent(url: string, sender: any = {}): Promise<void> {
    return dispatch({ action: AddTorrentMessage.action, webUiId: SEEDED_WEBUI_ID, url, config: {} }, sender).then(settle);
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
        expect(deserializeSettings(response).notificationsDurationMs).toBe(4321);
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
        const notification = { title: "T", message: "M", popupDurationMs: 1000, playSound: false };

        const response = await dispatch({ action: TestNotificationMessage.action, ...notification, kind: "success" });

        expect(showNotification).toHaveBeenCalledWith({ ...notification, kind: "success" });
        expect(response).toEqual({});
    });

    it("shows a failed TestNotification as a failure", async () => {
        const notification = { title: "T", message: "M", popupDurationMs: 1000, playSound: false };

        await dispatch({ action: TestNotificationMessage.action, ...notification, kind: "failure" });

        expect(showNotification).toHaveBeenCalledWith({ ...notification, kind: "failure" });
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

        const listener = registerAndGetListener();

        const willRespondAsync = listener({ action: UpdateActionBadgeText.action, text: "3" }, { tab: { id: 5 } }, sendResponse);

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

    it("adds to the first WebUI when the pre-add names none", async () => {
        seedSingleWebUi();
        const fetch = stubClientAccepts();

        await dispatch({ action: PreAddTorrentMessage.action, url: MAGNET_URL }, TRACKER_TAB);
        await settle();

        expect(fetch).toHaveBeenCalled();
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

        expect(shownNotification()).toMatchObject({ title: "Cloudflare is blocking this download", clickUrl: TRACKER_URL });
    });
});
