import { TorrentWebUI } from "../models/webui";


interface RegisteredAuthListeners {
    onAuth: (details: chrome.webRequest.OnAuthRequiredDetails) => chrome.webRequest.BlockingResponse;
    onSettled: (details: { requestId: string }) => void;
}

const registeredListeners: RegisteredAuthListeners[] = [];
const triedRequestIds: Set<string> = new Set();

export function registerAuthenticationListenersForAllWebUis(allWebUis: TorrentWebUI[]): void {
    registeredListeners.forEach(({ onAuth, onSettled }) => {
        chrome.webRequest.onAuthRequired.removeListener(onAuth);
        chrome.webRequest.onCompleted.removeListener(onSettled);
        chrome.webRequest.onErrorOccurred.removeListener(onSettled);
    });
    registeredListeners.length = 0;
    triedRequestIds.clear();

    allWebUis.forEach(webUi => {
        if (!webUi.settings.host || !webUi.settings.port) {
            return;
        }

        const url = webUi.createBaseUrl().replace(/\/+$/, "") + "/*";

        const onAuth = (details: chrome.webRequest.OnAuthRequiredDetails): chrome.webRequest.BlockingResponse => {
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

        const onSettled = (details: { requestId: string }): void => {
            triedRequestIds.delete(details.requestId);
        };

        console.debug(`Registering auth listener for: ${url} (${webUi.settings.name})`);
        chrome.webRequest.onAuthRequired.addListener(onAuth, { urls: [url] }, ["blocking"]);
        chrome.webRequest.onCompleted.addListener(onSettled, { urls: [url] });
        chrome.webRequest.onErrorOccurred.addListener(onSettled, { urls: [url] });
        registeredListeners.push({ onAuth, onSettled });
    });
}
