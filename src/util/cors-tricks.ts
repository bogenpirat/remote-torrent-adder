import { ext } from "./browser-api";
import { type TorrentWebUI } from "../models/webui";

type HeaderModification = chrome.declarativeNetRequest.ModifyHeaderInfo;

export async function registerCorsCircumventionForWebUis(allWebUis: TorrentWebUI[]): Promise<void> {
    const oldRuleIds = (await ext.declarativeNetRequest.getSessionRules())
        .map(rule => rule.id);
    const newRules = allWebUis
        .map((webUi, index) => ({ id: index + 1, baseUrl: webUi.createBaseUrl() }))
        .filter(target => hasUsableHost(target.baseUrl))
        .map(target => createHeaderRule(target.id, target.baseUrl, [{ header: "origin", operation: "remove" }]));

    await ext.declarativeNetRequest.updateSessionRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    });
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

export async function executeMethodWrappedWithOriginStripped<T>(method: () => Promise<T>, baseUrl: string): Promise<T> {
    const originStripperRuleId = allocateDynamicRuleId();
    await ext.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [originStripperRuleId],
        addRules: [createHeaderRule(originStripperRuleId, baseUrl, [{ header: "origin", operation: "remove" }])]
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
        addRules: [createHeaderRule(refererSetterRuleId, url, [
            { header: "Referer", operation: "set", value: referer },
            { header: "Origin", operation: "remove" }
        ])]
    });
    try {
        return await method();
    } finally {
        await ext.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [refererSetterRuleId],
        });
    }
}

let nextDynamicRuleId = 0;

function allocateDynamicRuleId(): number {
    nextDynamicRuleId = (nextDynamicRuleId % 2_000_000_000) + 1;
    return nextDynamicRuleId;
}

function createHeaderRule(id: number, urlPrefix: string, requestHeaders: HeaderModification[]): chrome.declarativeNetRequest.Rule {
    return {
        id,
        priority: 100,
        action: {
            type: "modifyHeaders",
            requestHeaders
        },
        condition: {
            urlFilter: `|${urlPrefix}*`,
            resourceTypes: ["xmlhttprequest"]
        }
    };
}
