import { addTrailingSlash } from "./utils";
import { loadWebUis } from "./webuis";


export function registerActionClickListener(): void {
    chrome.action.onClicked.addListener(() => {
        openPrimaryWebUi().catch(error => console.error("Failed opening WebUI from the action icon", error));
    });
}

export async function openPrimaryWebUi(): Promise<void> {
    const [primaryWebUi] = await loadWebUis();
    if (!primaryWebUi) {
        console.warn("Action icon clicked, but no WebUI is configured.");
        return;
    }
    await chrome.tabs.create({
        url: addTrailingSlash(primaryWebUi.createBaseUrl()),
        active: true,
    });
}

export function updateBadgeText(text: string, tabId: number): void {
    chrome.action.setBadgeText({text, tabId}).then();
}
