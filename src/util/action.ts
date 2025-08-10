import { TorrentWebUI } from "../models/webui";


export function registerClickActionForIcon(webUi: TorrentWebUI | null): (tab: chrome.tabs.Tab) => Promise<void> {
    const clickActionListener = async (tab: chrome.tabs.Tab) => {
        if (webUi) {
            await chrome.tabs.create({
                url: webUi.createBaseUrl(),
                active: true,
            });
        }
    };
    chrome.action.onClicked.addListener(clickActionListener);
    return clickActionListener;
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