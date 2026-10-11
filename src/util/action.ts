import { ext } from "./browser-api";
import { addTrailingSlash } from "./utils";
import { initiateWebUis, loadWebUis } from "./webuis";
import { Settings } from "./settings";
import { type RTASettings } from "../models/settings";


export const POPUP_PAGE = "popup/popup.html";

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
    const popup = mode ? `${POPUP_PAGE}?mode=${mode}` : POPUP_PAGE;
    await ext.action.setPopup({ popup });
    try {
        await ext.action.openPopup({ windowId });
    } finally {
        await ext.action.setPopup({ popup: "" });
    }
}

export function openPopupWindow(mode?: PopupMode): void {
    const url = mode ? `${POPUP_PAGE}?mode=${mode}` : POPUP_PAGE;
    void ext.windows.create({
        url,
        type: "popup",
        width: 420,
        height: 600,
        focused: true
    });
}

export function updateBadgeText(text: string, tabId: number): void {
    ext.action.setBadgeText({text, tabId}).then();
}
