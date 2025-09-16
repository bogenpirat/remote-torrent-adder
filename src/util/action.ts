import { TorrentWebUI } from "../models/webui";
import { addTrailingSlash } from "./utils";


export function registerClickActionForIcon(webUi: TorrentWebUI | null): (tab: chrome.tabs.Tab) => Promise<void> {
    const clickActionListener = async (tab: chrome.tabs.Tab) => {
        if (webUi) {
            await chrome.tabs.create({
                url: addTrailingSlash(webUi.createBaseUrl()),
                active: true,
            });
        }
    };
    chrome.action.onClicked.addListener(clickActionListener);
    return clickActionListener;
}

export function updateBadgeText(text: string, tabId: number): void {
    if (text !== '') {
        chrome.action.setBadgeText({ text, tabId });
    }
}