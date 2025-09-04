import { TorrentWebUI } from "../models/webui";


const onAuthListeners = [];
var triedRequestIds: Set<string> = new Set();

export function registerAuthenticationListenersForAllWebUis(allWebUis: TorrentWebUI[]): void {
    onAuthListeners.forEach(listener => {
        chrome.webRequest.onAuthRequired.removeListener(listener);
    });
    onAuthListeners.length = 0;

    allWebUis.forEach(webUi => {
        const url = webUi.createBaseUrl().replace(/\/+$/, "") + "/*";

        const listener = (details: chrome.webRequest.OnAuthRequiredDetails): chrome.webRequest.BlockingResponse => {
            if (details.tabId !== -1) {
                return {};
            }

            if (triedRequestIds.has(details.requestId)) {
                // Second firing for this request, let the browser handle it
                triedRequestIds.delete(details.requestId);
                return {};
            }

            triedRequestIds.add(details.requestId);
            return {
                authCredentials: {
                    username: webUi.settings.username,
                    password: webUi.settings.password
                }
            };
        };

        if (webUi.settings.host && webUi.settings.port) {
            console.debug(`Registering auth listener for: ${url} (${webUi.settings.name})`);
            chrome.webRequest.onAuthRequired.addListener(listener, { urls: [url] }, ["blocking"]);
            onAuthListeners.push(listener);
        }
    });
}
