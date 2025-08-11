import { RegisteredListeners } from "../models/messages";

export function generateId(): string {
    return crypto.randomUUID();
}

export function clearListeners(listeners: RegisteredListeners): void {
    if (listeners.messageListener) {
        chrome.runtime.onMessage.removeListener(listeners.messageListener);
    }

    if (listeners.actionIconListener) {
        chrome.action.onClicked.removeListener(listeners.actionIconListener);
    }

}

export function isMatchedByRegexes(url: string, regexes: RegExp[]): boolean {
    return regexes.some(regex => regex.test(url));
}
