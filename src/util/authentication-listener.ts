import { TorrentWebUI } from "../models/webui";
import { loadWebUis } from "./webuis";


const MAX_TRACKED_REQUESTS = 256;
const triedRequestIds: Set<string> = new Set();

export function registerAuthenticationListener(): void {
    chrome.webRequest.onAuthRequired.addListener(
        (details, asyncCallback) => {
            if (!asyncCallback) {
                return {};
            }
            if (details.tabId !== -1) {
                asyncCallback({});
                return;
            }
            resolveAuthCredentials(details)
                .catch(error => {
                    console.error("Failed resolving credentials for auth challenge", error);
                    return {} as chrome.webRequest.BlockingResponse;
                })
                .then(asyncCallback);
            return;
        },
        { urls: ["<all_urls>"] },
        ["asyncBlocking"]
    );
}

export async function resolveAuthCredentials(
    details: chrome.webRequest.OnAuthRequiredDetails
): Promise<chrome.webRequest.BlockingResponse> {
    if (details.tabId !== -1) {
        return {};
    }

    if (triedRequestIds.has(details.requestId)) {
        // Second firing for this request, let the browser handle it
        triedRequestIds.delete(details.requestId);
        return {};
    }

    const webUi = (await loadWebUis()).find(candidate => isRequestForWebUi(details.url, candidate));
    if (!webUi) {
        return {};
    }

    rememberRequest(details.requestId);
    return {
        authCredentials: {
            username: webUi.settings.username,
            password: webUi.settings.password
        }
    };
}

function isRequestForWebUi(url: string, webUi: TorrentWebUI): boolean {
    if (!webUi.settings.host || !webUi.settings.port || !url) {
        return false;
    }
    const baseUrl = webUi.createBaseUrl().replace(/\/+$/, "");
    return url === baseUrl || url.startsWith(baseUrl + "/");
}

function rememberRequest(requestId: string): void {
    triedRequestIds.add(requestId);
    while (triedRequestIds.size > MAX_TRACKED_REQUESTS) {
        const oldest = triedRequestIds.values().next().value;
        if (oldest === undefined) {
            return;
        }
        triedRequestIds.delete(oldest);
    }
}
