import { TorrentWebUI } from "../models/webui";

export function registerCorsCircumventionForWebUis(allWebUis: TorrentWebUI[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
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

        chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: oldRuleIds,
            addRules: newRules
        });
    });
}

export function executeMethodWrappedWithReferer<T>(method: () => Promise<T>, url: string, referer: string): Promise<T> {
    return new Promise(async (resolve, reject) => {
        const refererSetterRuleId = (await chrome.declarativeNetRequest.getDynamicRules()).length + 1;
        chrome.declarativeNetRequest.updateDynamicRules({
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
        }).then(async () => {
            try {
                resolve(await method());
            } catch (error) {
                reject(error);
            } finally {
                chrome.declarativeNetRequest.updateSessionRules({
                    removeRuleIds: [refererSetterRuleId],
                });
            }
        }, (error) => {
            console.error("Failed to add referer rule", error);
            reject(error);
        });
    });
}
