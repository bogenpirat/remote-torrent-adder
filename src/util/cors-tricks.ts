import { TorrentWebUI } from "../models/webui";

export async function registerCorsCircumventionForWebUis(allWebUis: TorrentWebUI[]): Promise<void> {
    const oldRuleIds = (await chrome.declarativeNetRequest.getSessionRules())
        .map(rule => rule.id);
    const newRules: chrome.declarativeNetRequest.Rule[] = [];

    allWebUis.forEach((webUi, index) => {
        const webUiBaseUrl = webUi.createBaseUrl();
        if (webUiBaseUrl) {
            const rule: chrome.declarativeNetRequest.Rule = {
                id: index + 1,
                priority: 100,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "origin",
                            operation: "remove"
                        }
                    ]
                },
                condition: {
                    urlFilter: `|${webUiBaseUrl}*`,
                    resourceTypes: ["xmlhttprequest"]
                }
            };
            newRules.push(rule);
        }
    });

    try {
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: oldRuleIds,
            addRules: newRules
        });
    } catch (error) {
        // Firefox extensions with host permissions issue cross-origin requests
        // without an Origin header, so this circumvention is usually a no-op
        // there. Some Gecko versions also restrict modifying these headers via
        // declarativeNetRequest; swallow the error so it doesn't break setup.
        console.warn("Could not register CORS circumvention rules", error);
    }
}

export async function executeMethodWrappedWithReferer<T>(method: () => Promise<T>, url: string, referer: string): Promise<T> {
    let refererSetterRuleId: number | null = null;
    try {
        refererSetterRuleId = (await chrome.declarativeNetRequest.getDynamicRules()).length + 1;
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [
                {
                    id: refererSetterRuleId,
                    priority: 100,
                    action: {
                        type: "modifyHeaders",
                        requestHeaders: [
                            {
                                header: "Referer",
                                operation: "set",
                                value: referer
                            }
                        ]
                    },
                    condition: {
                        urlFilter: `|${url}*`,
                        resourceTypes: ["xmlhttprequest"]
                    }
                }
            ]
        });
    } catch (error) {
        // Some browsers (notably Firefox) may refuse to set the Referer header
        // via declarativeNetRequest. Fall back to performing the request anyway.
        console.warn("Could not set Referer header for request", error);
        refererSetterRuleId = null;
    }

    try {
        return await method();
    } finally {
        if (refererSetterRuleId !== null) {
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [refererSetterRuleId],
            }).catch(error => console.warn("Could not remove Referer header rule", error));
        }
    }
}
