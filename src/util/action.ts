import { ext } from "./browser-api";
import { addTrailingSlash } from "./utils";
import { initiateWebUis, loadWebUis } from "./webuis";
import { Settings } from "./settings";
import { type RTASettings } from "../models/settings";


export const POPUP_PAGE = "popup/popup.html";
const POPUP_WINDOW_WIDTH = 420;
const POPUP_WINDOW_HEIGHT = 600;

export type PopupMode = "picker" | "links";

export function registerActionClickListener(): void {
    ext.action.onClicked.addListener((tab) => {
        handleActionClick(tab).catch(error => console.error("Failed handling action icon click", error));
    });
}

async function handleActionClick(tab: chrome.tabs.Tab): Promise<void> {
    const settings = await new Settings().loadSettings();

    if (tab.windowId !== undefined) {
        const popupMode = await resolvePopupMode(settings);
        if (popupMode) {
            await openActionPopup(tab.windowId, popupMode);
            return;
        }
    }

    await openPrimaryWebUi();
}

async function resolvePopupMode(settings: RTASettings): Promise<PopupMode | undefined> {
    const iconClickAction = settings.iconClickAction ?? "openPrimaryWebUi";
    if (iconClickAction === "showPageLinks") {
        return "links";
    }
    if (iconClickAction === "showWebUiPicker" && (await initiateWebUis(settings)).length > 1) {
        return "picker";
    }
    return undefined;
}

export async function openPrimaryWebUi(): Promise<void> {
    const [primaryWebUi] = await loadWebUis();
    if (!primaryWebUi) {
        console.warn("Action icon clicked, but no WebUI is configured.");
        return;
    }
    await ext.tabs.create({
        url: addTrailingSlash(primaryWebUi.createBaseUrl()),
        active: true,
    });
}

export async function openActionPopup(windowId: number, mode?: PopupMode): Promise<void> {
    await ext.action.setPopup({ popup: popupPageFor(mode) });
    try {
        await ext.action.openPopup({ windowId });
    } finally {
        await ext.action.setPopup({ popup: "" });
    }
}

export async function resolveWindowId(tab?: chrome.tabs.Tab): Promise<number> {
    if (tab?.windowId !== undefined) {
        return tab.windowId;
    }
    return (await ext.windows.getLastFocused()).id ?? 0;
}

export function openPopupWindow(mode?: PopupMode): void {
    ext.windows.create({
        url: popupPageFor(mode),
        type: "popup",
        width: POPUP_WINDOW_WIDTH,
        height: POPUP_WINDOW_HEIGHT,
        focused: true
    }).catch(error => console.error("Failed opening the popup window:", error));
}

function popupPageFor(mode?: PopupMode): string {
    return mode ? `${POPUP_PAGE}?mode=${mode}` : POPUP_PAGE;
}

export function updateBadgeText(text: string, tabId: number): void {
    ext.action.setBadgeText({ text, tabId })
        .catch(error => console.error(`Failed setting the badge text of tab ${tabId}:`, error));
}
