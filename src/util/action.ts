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