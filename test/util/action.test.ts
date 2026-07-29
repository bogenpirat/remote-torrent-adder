import { describe, it, expect } from "vitest";
import { registerActionClickListener, openPrimaryWebUi, updateBadgeText } from "../../src/util/action";
import { makeWebUISettings, seedWebUISettings } from "../helpers/fixtures";

function registeredClickListener() {
    registerActionClickListener();
    const calls = (chrome.action.onClicked.addListener as any).mock.calls;
    return calls[calls.length - 1][0];
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe("registerActionClickListener", () => {
    it("registers the listener without needing any settings loaded first", () => {
        registerActionClickListener();
        expect(chrome.action.onClicked.addListener).toHaveBeenCalledTimes(1);
        expect(chrome.storage.local.get).not.toHaveBeenCalled();
    });

    it("resolves the webui at click time and opens it", async () => {
        seedWebUISettings([makeWebUISettings({ host: "h", port: 8080 })]);
        registeredClickListener()({} as chrome.tabs.Tab);
        await flush();
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://h:8080/", active: true });
    });
});

describe("openPrimaryWebUi", () => {
    it("opens the first configured webui", async () => {
        seedWebUISettings([
            makeWebUISettings({ id: "a", host: "first", port: 8080 }),
            makeWebUISettings({ id: "b", host: "second", port: 9090 }),
        ]);
        await openPrimaryWebUi();
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://first:8080/", active: true });
    });

    it("does nothing when no webui is configured", async () => {
        seedWebUISettings([]);
        await openPrimaryWebUi();
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
