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

let nextDynamicRuleId = 0;

function allocateDynamicRuleId(): number {
    nextDynamicRuleId = (nextDynamicRuleId % 2_000_000_000) + 1;
    return nextDynamicRuleId;
}

export async function executeMethodWrappedWithOriginStripped<T>(method: () => Promise<T>, baseUrl: string): Promise<T> {
    const originStripperRuleId = allocateDynamicRuleId();
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [originStripperRuleId],
        addRules: [
            {
                id: originStripperRuleId,
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
                    urlFilter: `|${baseUrl}*`,
                    resourceTypes: ["xmlhttprequest"]
                }
            }
        ]
    });
    try {
        return await method();
    } finally {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [originStripperRuleId],
        });
    }
}

export async function executeMethodWrappedWithReferer<T>(method: () => Promise<T>, url: string, referer: string): Promise<T> {
    const refererSetterRuleId = allocateDynamicRuleId();
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [refererSetterRuleId],
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
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [refererSetterRuleId],
        });
    }
}
