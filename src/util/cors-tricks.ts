import { ext } from "./browser-api";
import { type TorrentWebUI } from "../models/webui";
import { isFirefox } from "./platform";

const NO_TAB_ID = -1;

function ownRequestsOnly(): Partial<chrome.declarativeNetRequest.RuleCondition> {
    return isFirefox() ? {} : { initiatorDomains: [ext.runtime.id] };
}

function hasUsableHost(baseUrl: string): boolean {
    if (!baseUrl) {
        return false;
    }
    try {
        return new URL(baseUrl).hostname !== "";
    } catch {
        return false;
    }
}

export async function registerCorsCircumventionForWebUis(allWebUis: TorrentWebUI[]): Promise<void> {
    const oldRuleIds = (await ext.declarativeNetRequest.getSessionRules())
        .map(rule => rule.id);
    const newRules: chrome.declarativeNetRequest.Rule[] = [];

    allWebUis.forEach((webUi, index) => {
        const webUiBaseUrl = webUi.createBaseUrl();
        if (hasUsableHost(webUiBaseUrl)) {
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
                    resourceTypes: ["xmlhttprequest"],
                    tabIds: [NO_TAB_ID],
                    ...ownRequestsOnly()
                }
            };
            newRules.push(rule);
        }
    });

    await ext.declarativeNetRequest.updateSessionRules({
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
    await ext.declarativeNetRequest.updateDynamicRules({
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
                    resourceTypes: ["xmlhttprequest"],
                    ...ownRequestsOnly()
                }
            }
        ]
    });
    try {
        return await method();
    } finally {
        await ext.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [originStripperRuleId],
        });
    }
}

export async function executeMethodWrappedWithReferer<T>(method: () => Promise<T>, url: string, referer: string): Promise<T> {
    const refererSetterRuleId = allocateDynamicRuleId();
    await ext.declarativeNetRequest.updateDynamicRules({
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
                        },
                        {
                            header: "Origin",
                            operation: "remove"
                        }
                    ]
                },
                condition: {
                    urlFilter: `|${url}*`,
                    resourceTypes: ["xmlhttprequest"],
                    ...ownRequestsOnly()
                }
            }
        ]
    });
    try {
        return await method();
    } finally {
        await ext.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [refererSetterRuleId],
        });
    }
}
