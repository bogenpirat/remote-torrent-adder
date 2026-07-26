import { describe, it, expect, vi } from "vitest";
import { registerClickActionForIcon, updateBadgeText } from "../../src/util/action";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings } from "../helpers/fixtures";

describe("registerClickActionForIcon", () => {
    it("registers a click listener and opens the webui base url on click", async () => {
        const webUi = new QBittorrentWebUI(makeWebUISettings({ host: "h", port: 8080 }));
        const listener = registerClickActionForIcon(webUi);

        expect(chrome.action.onClicked.addListener).toHaveBeenCalledWith(listener);
        await listener({} as chrome.tabs.Tab);
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://h:8080/", active: true });
    });

    it("does nothing on click when there is no webui", async () => {
        const listener = registerClickActionForIcon(null);
        await listener({} as chrome.tabs.Tab);
        expect(chrome.tabs.create).not.toHaveBeenCalled();
    });
});

describe("updateBadgeText", () => {
    it("sets the badge text for the tab when non-empty", () => {
        updateBadgeText("3", 42);
        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "3", tabId: 42 });
    });

    it("clears the badge with an empty string", () => {
        updateBadgeText("", 42);
        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId: 42 });
    });
});
