import { registerMessageListener } from "../../src/util/messaging";
import { deserializeSettings } from "../../src/util/serializer";

export function registerAndGetListener() {
    registerMessageListener();
    const calls = (chrome.runtime.onMessage.addListener as any).mock.calls;
    return calls[calls.length - 1][0];
}

/** Invokes the listener and resolves with the value passed to sendResponse. */
export function dispatch(message: any, sender: any = {}): Promise<any> {
    const listener = registerAndGetListener();
    return new Promise((resolve) => {
        listener(message, sender, resolve);
    });
}

export function storedSettings() {
    return deserializeSettings((chrome as any).__storage.settings);
}
