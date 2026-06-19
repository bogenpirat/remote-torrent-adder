import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub out the messaging module so we can observe dispatched torrents without
// pulling in the whole service-worker dependency graph.
const { dispatchPreAddTorrent } = vi.hoisted(() => ({ dispatchPreAddTorrent: vi.fn() }));
vi.mock("../../src/util/messaging", () => ({ dispatchPreAddTorrent }));

import { createContextMenu } from "../../src/util/context-menu";
import { PreAddTorrentMessage, AddTorrentMessage } from "../../src/models/messages";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings } from "../helpers/fixtures";

const webUi = (id: string, name: string) =>
    new QBittorrentWebUI(makeWebUISettings({ id, name, host: "h", port: 8080 }));

const clickData = (menuItemId: string): any => ({ menuItemId, linkUrl: "http://x/file.torrent" });
const tab: any = { windowId: 11 };

function lastClickListener() {
    const calls = (chrome.contextMenus.onClicked.addListener as any).mock.calls;
    return calls[calls.length - 1][0];
}

beforeEach(() => dispatchPreAddTorrent.mockClear());

describe("createContextMenu", () => {
    it("creates only the parent menu for a single webui", () => {
        createContextMenu([webUi("a", "Server A")]);
        const created = (chrome.contextMenus.create as any).mock.calls.map((c: any[]) => c[0].id);
        expect(created).toEqual(["server-main"]);
    });

    it("creates per-server, separator and send-all entries for multiple webuis", () => {
        createContextMenu([webUi("a", "Server A"), webUi("b", "Server B")]);
        const created = (chrome.contextMenus.create as any).mock.calls.map((c: any[]) => c[0].id);
        expect(created).toContain("server-0");
        expect(created).toContain("server-1");
        expect(created).toContain("sendall-separator");
        expect(created).toContain("server-all");
    });

    it("dispatches a pre-add for the first webui on the main entry", () => {
        createContextMenu([webUi("a", "Server A")]);
        lastClickListener()(clickData("server-main"), tab);
        expect(dispatchPreAddTorrent).toHaveBeenCalledTimes(1);
        const [message, windowId] = dispatchPreAddTorrent.mock.calls[0];
        expect(message.action).toBe(PreAddTorrentMessage.action);
        expect(message.webUiId).toBe("a");
        expect(message.url).toBe("http://x/file.torrent");
        expect(windowId).toBe(11);
    });

    it("dispatches a pre-add for the indexed webui", () => {
        createContextMenu([webUi("a", "A"), webUi("b", "B")]);
        lastClickListener()(clickData("server-1"), tab);
        expect(dispatchPreAddTorrent.mock.calls[0][0].webUiId).toBe("b");
    });

    it("dispatches an add-torrent message to every webui on send-all", () => {
        createContextMenu([webUi("a", "A"), webUi("b", "B")]);
        lastClickListener()(clickData("server-all"), tab);
        expect(dispatchPreAddTorrent).toHaveBeenCalledTimes(2);
        for (const [message] of dispatchPreAddTorrent.mock.calls) {
            expect(message.action).toBe(AddTorrentMessage.action);
        }
    });

    it("removes the previous click listener when rebuilt", () => {
        createContextMenu([webUi("a", "A")]);
        createContextMenu([webUi("a", "A")]);
        expect(chrome.contextMenus.onClicked.removeListener).toHaveBeenCalled();
        expect(chrome.contextMenus.removeAll).toHaveBeenCalled();
    });
});
