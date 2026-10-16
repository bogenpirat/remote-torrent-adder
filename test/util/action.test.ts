import { describe, it, expect, vi } from "vitest";
import { registerActionClickListener, openPrimaryWebUi, openPopupWindow, updateBadgeText } from "../../src/util/action";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { serializeSettings } from "../../src/util/serializer";
import { SETTINGS_KEY } from "../../src/util/settings";
import { makeWebUISettings, seedWebUISettings } from "../helpers/fixtures";

function registeredClickListener() {
    registerActionClickListener();
    const calls = (chrome.action.onClicked.addListener as any).mock.calls;
    return calls[calls.length - 1][0];
}

function seedSettings(overrides: Partial<ReturnType<typeof getDefaultSettings>>): void {
    const settings = { ...getDefaultSettings(), ...overrides };
    (chrome as any).__storage[SETTINGS_KEY] = serializeSettings(settings);
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const PRIMARY_WEBUI_TAB = { url: "http://h:8080/", active: true };

async function clickAction(tab: Partial<chrome.tabs.Tab> = {}): Promise<void> {
    registeredClickListener()(tab as chrome.tabs.Tab);
    await flush();
}

function expectPopupOpened(mode: string, windowId: number): void {
    expect(chrome.action.setPopup).toHaveBeenCalledWith({ popup: `popup/popup.html?mode=${mode}` });
    expect(chrome.action.openPopup).toHaveBeenCalledWith({ windowId });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
}

function expectPrimaryWebUiOpened(): void {
    expect(chrome.action.openPopup).not.toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalledWith(PRIMARY_WEBUI_TAB);
}

describe("registerActionClickListener", () => {
    it("registers the listener without needing any settings loaded first", () => {
        registerActionClickListener();
        expect(chrome.action.onClicked.addListener).toHaveBeenCalledTimes(1);
        expect(chrome.storage.local.get).not.toHaveBeenCalled();
    });

    it("resolves the webui at click time and opens it", async () => {
        seedWebUISettings([makeWebUISettings({ host: "h", port: 8080 })]);

        await clickAction();

        expect(chrome.tabs.create).toHaveBeenCalledWith(PRIMARY_WEBUI_TAB);
    });

    it("opens the WebUI picker popup when that behavior is selected and multiple WebUIs are configured", async () => {
        const webuiSettings = [makeWebUISettings({ id: "a" }), makeWebUISettings({ id: "b" })];
        seedSettings({ iconClickAction: "showWebUiPicker", webuiSettings });

        await clickAction({ windowId: 5 });

        expectPopupOpened("picker", 5);
    });

    it("falls back to opening the primary WebUI when the picker is selected but only one WebUI is configured", async () => {
        seedSettings({ iconClickAction: "showWebUiPicker", webuiSettings: [makeWebUISettings({ id: "a", host: "h", port: 8080 })] });

        await clickAction({ windowId: 5 });

        expectPrimaryWebUiOpened();
    });

    it("opens the page-links popup when that behavior is selected", async () => {
        seedSettings({ iconClickAction: "showPageLinks", webuiSettings: [makeWebUISettings()] });

        await clickAction({ windowId: 9 });

        expectPopupOpened("links", 9);
    });

    it("falls back to opening the primary WebUI when the window id is unknown", async () => {
        seedSettings({ iconClickAction: "showPageLinks", webuiSettings: [makeWebUISettings({ host: "h", port: 8080 })] });

        await clickAction();

        expectPrimaryWebUiOpened();
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
    it("logs the tab whose badge could not be set", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.action.setBadgeText as any).mockRejectedValueOnce(new Error("tab closed"));

        updateBadgeText("3", 42);

        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
            "Failed setting the badge text of tab 42:",
            expect.objectContaining({ message: "tab closed" }),
        ));
    });

    it("sets the badge text for the tab when non-empty", () => {
        updateBadgeText("3", 42);
        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "3", tabId: 42 });
    });

    it("clears the badge with an empty string", () => {
        updateBadgeText("", 42);
        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId: 42 });
    });
});

describe("openPopupWindow", () => {
    it("opens the popup page in the requested mode", () => {
        openPopupWindow("picker");

        expect(chrome.windows.create).toHaveBeenCalledWith(expect.objectContaining({ url: "popup/popup.html?mode=picker" }));
    });

    it("logs a window that could not be opened", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.windows.create as any).mockRejectedValueOnce(new Error("no display"));

        openPopupWindow();

        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
            "Failed opening the popup window:",
            expect.objectContaining({ message: "no display" }),
        ));
    });
});
