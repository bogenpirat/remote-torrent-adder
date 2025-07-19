import { WebUISettings } from "../models/webui";

type OnAuthListenerCallback = (details: chrome.webRequest.OnAuthRequiredDetails, asyncCallback?: (response: chrome.webRequest.BlockingResponse) => void) => chrome.webRequest.BlockingResponse;

const onAuthListeners: OnAuthListenerCallback[] = [];
var triedRequestIds: Set<string> = new Set();

export function registerAuthenticationListenersForAllWebUis(allWebUiSettings: WebUISettings[]) {
    while (onAuthListeners.length > 0) {
        onAuthListeners.forEach(listener => {
            chrome.webRequest.onAuthRequired.removeListener(listener);
        });
    }

    allWebUiSettings.forEach(webUiSettings => {
        const url = "http" + (webUiSettings.secure ? "s" : "") + "://" + webUiSettings.host + ":" + webUiSettings.port + "/";

        const listener: OnAuthListenerCallback = (function (user: string, pass: string, url: string) {
            return function (details: chrome.webRequest.OnAuthRequiredDetails) {
                let suppliedAuthCredentials: chrome.webRequest.BlockingResponse = {};

                if (triedRequestIds.has(details.requestId)) { // second firing of an auth event for this request - let the browser handle it
                    triedRequestIds.delete(details.requestId);
                } else if (details.tabId != -1) {
                    // do not handle auth requests for tabs
                } else {
                    suppliedAuthCredentials = { authCredentials: { username: user, password: pass } };
                    triedRequestIds.add(details.requestId);
                }

                return suppliedAuthCredentials;
            };
        })(webUiSettings.username, webUiSettings.password, url);

        if (webUiSettings.host && webUiSettings.port) {
            chrome.webRequest.onAuthRequired.addListener(listener, { urls: [url + "*"], tabId: -1 }, ["blocking"]);
        }

        onAuthListeners.push(listener);
    });
}
