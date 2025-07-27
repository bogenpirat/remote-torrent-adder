import { RTASettings } from "../models/settings";
import { serializeSettings, deserializeSettings } from "./serializer";

export function registerSettingsMessageSender(settings: RTASettings): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "getSettings") {
            sendResponse(serializeSettings(settings));
        }
    });
}