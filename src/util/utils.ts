import { RegisteredListeners } from "../models/messages";

export function generateId(): string {
    return crypto.randomUUID();
}

export function clearListeners(listeners: RegisteredListeners): void {
    if (listeners.actionIconListener) {
        chrome.action.onClicked.removeListener(listeners.actionIconListener);
    }

}

export function isMatchedByRegexes(url: string, regexes: RegExp[]): boolean {
    return regexes.some(regex => regex.test(url));
}

export function getBaseUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin;
    } catch (e) {
        return '';
    }
}
