import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { createHash, webcrypto } from "node:crypto";
import bencode from "bencode";
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
    GetLinkCatchingConfig,
    SaveSettingsMessage,
    TestConnectionMessage,
    TestNotificationMessage,
    PreAddTorrentMessage,
    AddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    SetTorrentLabelMessage,
} from "../../src/models/messages";
import { serializeSettings, deserializeSettings, deserializeObject } from "../../src/util/serializer";
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
const EXTENSION_PAGE_SENDER = { id: "rta-test-id", url: "chrome-extension://rta-test-id/options/options.html" };
const CONTENT_SCRIPT_SENDER = { id: "rta-test-id", url: "https://tracker.example/browse", tab: { id: 7, windowId: 3 } };

function dispatch(message: any, sender: any = EXTENSION_PAGE_SENDER): Promise<any> {
    const listener = getListener();
    return new Promise((resolve) => {
        const willRespondAsync = listener(message, sender, resolve);
        if (!willRespondAsync) {
            // synchronous responders already called sendResponse
        }
    });
}

function expectHandlingErrorLogged(consoleError: MockInstance, action: string, message: string) {
    expect(consoleError).toHaveBeenCalledWith("Message handling error", action, expect.objectContaining({ message }));
}

beforeEach(() => {
    showNotification.mockClear();
    downloadTorrent.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
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

    it.each([
        { action: GetSettingsMessage.action },
        { action: SaveSettingsMessage.action, settings: serializeSettings(getDefaultSettings()) },
        { action: TestConnectionMessage.action, webUiSettings: makeWebUISettings({ host: "evil.example" }) },
        { action: AddTorrentMessage.action, webUiId: "w1", url: "magnet:?x", config: {} },
        { action: SetTorrentLabelMessage.action, webUiId: "w1", infoHash: "a".repeat(40), label: "l", labels: [] },
        { action: TestNotificationMessage.action, title: "T", message: "M" },
    ])("refuses $action from a content script", async message => {
        (globalThis as any).fetch = vi.fn();

        expect(await dispatch(message, CONTENT_SCRIPT_SENDER)).toEqual({
            error: `action not allowed from this sender: ${message.action}`,
        });
        expect(chrome.storage.local.get).not.toHaveBeenCalled();
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(showNotification).not.toHaveBeenCalled();
    });

    it("does not write a saved password to the console", async () => {
        const spies = (["log", "debug", "info", "warn", "error"] as const).map(level =>
            vi.spyOn(console, level).mockImplementation(() => undefined),
        );
        const toSave = getDefaultSettings();
        toSave.webuiSettings = [makeWebUISettings({ password: "s3cret-pass" })];

        await dispatch({ action: SaveSettingsMessage.action, settings: serializeSettings(toSave) });

        expect(JSON.stringify(spies.flatMap(spy => spy.mock.calls))).not.toContain("s3cret-pass");
        spies.forEach(spy => spy.mockRestore());
    });

    it("refuses a privileged action from another extension", async () => {
        const foreignSender = { id: "other-extension", url: "chrome-extension://other-extension/page.html" };

        expect(await dispatch({ action: GetSettingsMessage.action }, foreignSender)).toEqual({
            error: `action not allowed from this sender: ${GetSettingsMessage.action}`,
        });
    });

    it("still answers the link-catching config for a content script", async () => {
        const response = await dispatch({ action: GetLinkCatchingConfig.action }, CONTENT_SCRIPT_SENDER);

        expect(deserializeObject<{ linkCatchingEnabled: boolean }>(response)!.linkCatchingEnabled).toBe(true);
    });

});

describe("AddTorrent flow", () => {
    function seedWebUi(over = {}) {
        const settings = getDefaultSettings();
        settings.webuiSettings = [makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, host: "h", port: 8080, ...over })];
        (chrome as any).__storage.settings = serializeSettings(settings);
    }

    function stubOkFetch() {
        const fetchMock = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );
        (globalThis as any).fetch = fetchMock;
        return fetchMock;
    }

    function buildRealTorrent() {
        const info = { length: 1024, name: "file.bin", "piece length": 16384, pieces: new Uint8Array(20) };
        return {
            bytes: bencode.encode({ announce: "http://tracker.invalid/announce", info }) as Uint8Array<ArrayBuffer>,
            infoHash: createHash("sha1").update(bencode.encode(info)).digest("hex"),
        };
    }

    function parkFileTorrent(name: string, bytes: Uint8Array<ArrayBuffer>) {
        return saveBufferedTorrent({
            torrent: makeFileTorrent({ name, data: new NodeBlob([bytes]) as Blob }),
            webUiSettings: makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI }),
        });
    }

    function findUploadedForm(fetchMock: ReturnType<typeof stubOkFetch>): Promise<FormData> {
        return vi.waitFor(() => {
            const call = (fetchMock.mock.calls as any[][]).find(c => String(c[0]).includes("/torrents/add"));
            expect(call).toBeDefined();
            return call![1].body as FormData;
        });
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
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const failure = new Error("network down");
        seedWebUi();
        downloadTorrent.mockRejectedValue(failure);

        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "magnet:?x", config: {} });
        await new Promise((r) => setTimeout(r, 0));

        expect(showNotification).toHaveBeenCalled();
        expect(callArgs(showNotification, 0)[0]).toBe("Error downloading torrent");
        expect(consoleError).toHaveBeenCalledWith("Error downloading torrent:", failure);
    });

    it("hands the download over to the tab the link was clicked in", async () => {
        seedWebUi();
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );

        await dispatch(
            { action: PreAddTorrentMessage.action, webUiId: "w1", url: "https://tracker.org/get/1.torrent" },
            { id: "rta-test-id", tab: { id: 9, windowId: 1, url: "https://tracker.org/browse" }, frameId: 3 },
        );
        await new Promise((r) => setTimeout(r, 0));

        expect(downloadTorrent).toHaveBeenCalledWith("https://tracker.org/get/1.torrent", {
            tabId: 9,
            frameId: 3,
            pageUrl: "https://tracker.org/browse",
        });
    });

    it("points the notification at the tracker when Cloudflare challenges the download", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const challenge = new CloudflareChallengeError("https://tracker.org/get/1.torrent");
        seedWebUi();
        downloadTorrent.mockRejectedValue(challenge);

        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "https://tracker.org/get/1.torrent", config: {} });
        await new Promise((r) => setTimeout(r, 0));

        expect(callArgs(showNotification, 0)[0]).toBe("Cloudflare is blocking this download");
        expect(callArgs(showNotification, 0)[5]).toBe("https://tracker.org/get/1.torrent");
        expect(consoleError).toHaveBeenCalledWith("Error downloading torrent:", challenge);
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
        const fetchMock = stubOkFetch();
        vi.stubGlobal("crypto", webcrypto);
        const { bytes, infoHash } = buildRealTorrent();
        await parkFileTorrent("parked.torrent", bytes);

        await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: { label: "movies" },
            labels: [],
            directories: [],
        });
        const body = await findUploadedForm(fetchMock);
        const uploaded = body.get("torrents") as File;
        expect(uploaded.name).toBe("parked.torrent");
        expect(Array.from(new Uint8Array(await uploaded.arrayBuffer()))).toEqual(Array.from(bytes));
        expect(body.get("category")).toBe("movies");
        await vi.waitFor(() => expect(showNotification).toHaveBeenCalled());
        expect(callArgs(showNotification, 0)[6]).toEqual({ webUiId: "w1", infoHash, torrentName: "parked.torrent" });
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
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedWebUi();

        const response = await dispatch({
            action: AddTorrentMessageWithLabelAndDir.action,
            webUiId: "w1",
            config: {},
            labels: [],
            directories: [],
        });

        expect(response.error).toMatch(/No buffered torrent/i);
        expectHandlingErrorLogged(consoleError, AddTorrentMessageWithLabelAndDir.action, response.error);
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

    it("applies a torrent-name auto-label rule in the direct-add path", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({
                id: "w1",
                client: Client.QBittorrentWebUI,
                showPerTorrentConfigSelector: false,
                defaultLabel: "fallback",
                autoLabelDirSettings: [
                    { criteria: [{ field: "torrentName", value: "cool" }], label: "auto-movies", dir: null },
                ],
            }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        // the magnet fixture's name is "Cool Torrent"
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        const fetchMock = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Ok.") } as any),
        );
        (globalThis as any).fetch = fetchMock;

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 1);
        await new Promise((r) => setTimeout(r, 0));

        const uploadCall = (fetchMock.mock.calls as any[][]).find(call => String(call[0]).includes("/torrents/add"));
        expect(uploadCall).toBeDefined();
        expect((uploadCall![1].body as FormData).get("category")).toBe("auto-movies");
    });

    it("notifies instead of opening the popup when the download fails", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const challenge = new CloudflareChallengeError("https://tracker.org/get/1.torrent");
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: true }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockRejectedValue(challenge);

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "https://tracker.org/get/1.torrent", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        expect(callArgs(showNotification, 0)[0]).toBe("Cloudflare is blocking this download");
        expect(chrome.action.openPopup).not.toHaveBeenCalled();
        expect(await readBufferedTorrent()).toBeNull();
        expect(consoleError).toHaveBeenCalledWith("Error downloading torrent:", challenge);
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

    it("falls back to a popup window when the action popup cannot be opened", async () => {
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const refusal = new Error("openPopup requires a user gesture");
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: true }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        (chrome.action.openPopup as any).mockRejectedValue(refusal);

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        expect(chrome.windows.create).toHaveBeenCalledWith(
            expect.objectContaining({ url: "popup/popup.html", type: "popup" })
        );
        expect(consoleWarn).toHaveBeenCalledWith("Could not open the action popup; falling back to a window.", refusal);
    });

    it("clears the registered popup even when opening it fails", async () => {
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const refusal = new Error("nope");
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, showPerTorrentConfigSelector: true }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());
        (chrome.action.openPopup as any).mockRejectedValue(refusal);

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        expect(chrome.action.setPopup).toHaveBeenLastCalledWith({ popup: "" });
        expect(consoleWarn).toHaveBeenCalledWith("Could not open the action popup; falling back to a window.", refusal);
    });

    it("uses a popup window directly when the alternative chooser is enabled", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({
                id: "w1",
                client: Client.QBittorrentWebUI,
                showPerTorrentConfigSelector: true,
                useAlternativeLabelDirChooser: true,
            }),
        ];
        (chrome as any).__storage.settings = serializeSettings(settings);
        downloadTorrent.mockResolvedValue(makeMagnetTorrent());

        await dispatchPreAddTorrent({ action: PreAddTorrentMessage.action, url: "magnet:?x", webUiId: "w1" }, 7);
        await new Promise((r) => setTimeout(r, 0));

        expect(chrome.action.openPopup).not.toHaveBeenCalled();
        expect(chrome.windows.create).toHaveBeenCalled();
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

describe("labelling after the add", () => {
    const infoHash = "0123456789abcdef0123456789abcdef01234567";

    function seedWebUi(over = {}, globalOver: Partial<ReturnType<typeof getDefaultSettings>> = {}) {
        const settings = { ...getDefaultSettings(), ...globalOver };
        settings.webuiSettings = [makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, host: "h", port: 8080, labels: ["old"], ...over })];
        (chrome as any).__storage.settings = serializeSettings(settings);
    }

    function respondToEveryFetchWith(ok: boolean, status: number) {
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok, status, text: () => Promise.resolve(ok ? "Ok." : "nope") } as any),
        );
    }

    async function addMagnet() {
        downloadTorrent.mockResolvedValue(makeMagnetTorrent({ data: `magnet:?xt=urn:btih:${infoHash}`, name: "Cool Torrent" }));
        await dispatch({ action: AddTorrentMessage.action, webUiId: "w1", url: "magnet:?x", config: {} });
        await new Promise((r) => setTimeout(r, 0));
    }

    it("offers the label action on the success notification of a client with labels", async () => {
        seedWebUi();
        respondToEveryFetchWith(true, 200);

        await addMagnet();

        expect(callArgs(showNotification, 0)[6]).toEqual({ webUiId: "w1", infoHash, torrentName: "Cool Torrent" });
    });

    it("offers no label action when the button is turned off in the options", async () => {
        seedWebUi({}, { notificationsLabelButtonEnabled: false });
        respondToEveryFetchWith(true, 200);

        await addMagnet();

        expect(callArgs(showNotification, 0)[0]).toBe("Torrent added successfully");
        expect(callArgs(showNotification, 0)[6]).toBeUndefined();
    });

    it("offers no label action for a client without labels", async () => {
        seedWebUi({ client: Client.RqbitWebUI });
        (globalThis as any).fetch = vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("{}"), json: () => Promise.resolve({}) } as any),
        );

        await addMagnet();

        expect(callArgs(showNotification, 0)[0]).toBe("Torrent added successfully");
        expect(callArgs(showNotification, 0)[6]).toBeUndefined();
    });

    it("sets the label, remembers the label list and confirms with a notification", async () => {
        seedWebUi();
        respondToEveryFetchWith(true, 200);

        const response = await dispatch({
            action: SetTorrentLabelMessage.action,
            webUiId: "w1",
            infoHash,
            torrentName: "Cool Torrent",
            label: "movies",
            labels: ["movies", "old"],
        });

        expect(response).toEqual({});
        const setCategoryCall = (globalThis as any).fetch.mock.calls.find((call: any[]) => String(call[0]).endsWith("/setCategory"));
        expect(setCategoryCall[1].body.get("hashes")).toBe(infoHash);
        expect(at(deserializeSettings((chrome as any).__storage.settings)!.webuiSettings, 0).labels).toEqual(["movies", "old"]);
        expect(callArgs(showNotification, 0)[0]).toBe("Label set");
    });

    it("reports the failure to the popup and keeps the label list when the client refuses", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedWebUi();
        respondToEveryFetchWith(false, 500);

        const response = await dispatch({
            action: SetTorrentLabelMessage.action,
            webUiId: "w1",
            infoHash,
            torrentName: "Cool Torrent",
            label: "movies",
            labels: ["movies", "old"],
        });

        expect(response.error).toMatch(/Setting the label failed \(HTTP 500\)/);
        expect(at(deserializeSettings((chrome as any).__storage.settings)!.webuiSettings, 0).labels).toEqual(["old"]);
        expect(showNotification).not.toHaveBeenCalled();
        expectHandlingErrorLogged(consoleError, SetTorrentLabelMessage.action, response.error);
    });

    it("reports an unknown webui", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        seedWebUi();

        const response = await dispatch({
            action: SetTorrentLabelMessage.action,
            webUiId: "missing",
            infoHash,
            torrentName: "Cool Torrent",
            label: "movies",
            labels: [],
        });

        expect(response.error).toBe("No WebUI found for id missing");
        expectHandlingErrorLogged(consoleError, SetTorrentLabelMessage.action, "No WebUI found for id missing");
    });
});
