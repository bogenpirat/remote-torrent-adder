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

    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    });
}

export async function executeMethodWrappedWithReferer<T>(method: () => Promise<T>, url: string, referer: string): Promise<T> {
    const refererSetterRuleId = (await chrome.declarativeNetRequest.getDynamicRules()).length + 1;
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
    try {
        return await method();
    } finally {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [refererSetterRuleId],
        });
    }
}
