import { TorrentWebUI } from "../models/webui";


export function registerClickActionForIcon(webUi: TorrentWebUI | null): void {
    chrome.action.onClicked.addListener(async (tab) => {
        if (webUi) {
            await chrome.tabs.create({
                url: webUi.createBaseUrl(),
                active: true,
            });
        }
    });
}

export function updateBadgeText(text: string, tabId: number): void {
    if (text !== '') {
        chrome.action.enable(tabId);
        chrome.action.setBadgeText({ text, tabId });
    } else {
        chrome.action.getBadgeText({ tabId }).then(badgeText => {
            if (!badgeText) {
                chrome.action.disable(tabId);
            }
        });
    }
}