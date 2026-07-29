import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub out the messaging module so we can observe dispatched torrents without
// pulling in the whole service-worker dependency graph.
const { dispatchPreAddTorrent, addTorrentToWebUiById } = vi.hoisted(() => ({
    dispatchPreAddTorrent: vi.fn(),
    addTorrentToWebUiById: vi.fn(),
}));
vi.mock("../../src/util/messaging", () => ({ dispatchPreAddTorrent, addTorrentToWebUiById }));

import { refreshContextMenu, registerContextMenuClickListener } from "../../src/util/context-menu";
import { PreAddTorrentMessage } from "../../src/models/messages";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings, seedWebUISettings } from "../helpers/fixtures";

const settingsFor = (id: string, name: string) => makeWebUISettings({ id, name, host: "h", port: 8080 });
const webUi = (id: string, name: string) => new QBittorrentWebUI(settingsFor(id, name));

const clickData = (menuItemId: string): any => ({ menuItemId, linkUrl: "http://x/file.torrent" });
const tab: any = { windowId: 11 };

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function clickListener() {
    const calls = (chrome.contextMenus.onClicked.addListener as any).mock.calls;
    return calls[calls.length - 1][0];
}

/** Registers the listener, seeds the given webuis, then fires one menu click. */
async function click(menuItemId: string, webuis: ReturnType<typeof settingsFor>[]) {
    seedWebUISettings(webuis);
    registerContextMenuClickListener();
    clickListener()(clickData(menuItemId), tab);
    await flush();
}

beforeEach(() => {
    dispatchPreAddTorrent.mockClear();
    addTorrentToWebUiById.mockClear();
});

describe("refreshContextMenu", () => {
    it("creates only the parent menu for a single webui", () => {
        refreshContextMenu([webUi("a", "Server A")]);
        const created = (chrome.contextMenus.create as any).mock.calls.map((c: any[]) => c[0].id);
        expect(created).toEqual(["server-main"]);
    });

    it("creates per-server, separator and send-all entries for multiple webuis", () => {
        refreshContextMenu([webUi("a", "Server A"), webUi("b", "Server B")]);
        const created = (chrome.contextMenus.create as any).mock.calls.map((c: any[]) => c[0].id);
        expect(created).toContain("server-0");
        expect(created).toContain("server-1");
        expect(created).toContain("sendall-separator");
        expect(created).toContain("server-all");
    });

    it("lists the per-server entries in the order the webuis are given", () => {
        refreshContextMenu([webUi("a", "Server A"), webUi("b", "Server B"), webUi("c", "Server C")]);
        const perServer = (chrome.contextMenus.create as any).mock.calls
            .map((c: any[]) => c[0])
            .filter((item: any) => /^server-\d+$/.test(item.id));
        expect(perServer.map((item: any) => item.title)).toEqual(["Server A", "Server B", "Server C"]);
    });

    it("clears the previous menu before rebuilding", () => {
        refreshContextMenu([webUi("a", "A")]);
        expect(chrome.contextMenus.removeAll).toHaveBeenCalled();
    });
});

describe("registerContextMenuClickListener", () => {
    it("registers the listener without needing any settings loaded first", () => {
        registerContextMenuClickListener();
        expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
        expect(chrome.storage.local.get).not.toHaveBeenCalled();
    });

    it("dispatches a pre-add for the first webui on the main entry", async () => {
        await click("server-main", [settingsFor("a", "Server A")]);
        expect(dispatchPreAddTorrent).toHaveBeenCalledTimes(1);
        const [message, windowId] = dispatchPreAddTorrent.mock.calls[0];
        expect(message.action).toBe(PreAddTorrentMessage.action);
        expect(message.webUiId).toBe("a");
        expect(message.url).toBe("http://x/file.torrent");
        expect(windowId).toBe(11);
    });

    it("dispatches a pre-add for the indexed webui", async () => {
        await click("server-1", [settingsFor("a", "A"), settingsFor("b", "B")]);
        expect(dispatchPreAddTorrent.mock.calls[0][0].webUiId).toBe("b");
    });

    it("adds the torrent directly to every webui on send-all, bypassing the selector", async () => {
        await click("server-all", [settingsFor("a", "A"), settingsFor("b", "B")]);
        expect(addTorrentToWebUiById).toHaveBeenCalledTimes(2);
        expect(addTorrentToWebUiById.mock.calls.map((c: any[]) => c[0])).toEqual(["a", "b"]);
        expect(dispatchPreAddTorrent).not.toHaveBeenCalled();
    });

    it("picks up webuis added after the listener was registered", async () => {
        registerContextMenuClickListener();
        seedWebUISettings([settingsFor("late", "Added Later")]);
        clickListener()(clickData("server-main"), tab);
        await flush();
        expect(dispatchPreAddTorrent.mock.calls[0][0].webUiId).toBe("late");
    });

    it("falls back to the last focused window when the click carries no tab", async () => {
        seedWebUISettings([settingsFor("a", "A")]);
        registerContextMenuClickListener();
        clickListener()(clickData("server-main"), undefined);
        await flush();
        expect(dispatchPreAddTorrent.mock.calls[0][1]).toBe(1);
    });

    it("ignores clicks on unrelated menu entries", async () => {
        await click("some-other-extension-item", [settingsFor("a", "A")]);
        expect(dispatchPreAddTorrent).not.toHaveBeenCalled();
        expect(addTorrentToWebUiById).not.toHaveBeenCalled();
    });

    it("ignores a per-server click whose index no longer exists", async () => {
        await click("server-7", [settingsFor("a", "A")]);
        expect(dispatchPreAddTorrent).not.toHaveBeenCalled();
        expect(addTorrentToWebUiById).not.toHaveBeenCalled();
    });
});
