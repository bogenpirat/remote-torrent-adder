import { ext } from "./browser-api";
import { type TorrentWebUI } from "../models/webui";

type HeaderModification = chrome.declarativeNetRequest.ModifyHeaderInfo;

// Wraps around well before the 32-bit integer limit Chrome puts on rule ids.
const MAX_DYNAMIC_RULE_ID = 2_000_000_000;
// Above the default priority of 1, so these header changes take precedence over unprioritised rules.
const HEADER_RULE_PRIORITY = 100;
const REMOVE_ORIGIN: HeaderModification = { header: "origin", operation: "remove" };

export async function registerCorsCircumventionForWebUis(allWebUis: TorrentWebUI[]): Promise<void> {
    const oldRuleIds = (await ext.declarativeNetRequest.getSessionRules())
        .map(rule => rule.id);
    const newRules = allWebUis
        .map((webUi, index) => ({ id: index + 1, baseUrl: webUi.createBaseUrl() }))
        .filter(target => hasUsableHost(target.baseUrl))
        .map(target => createHeaderRule(target.id, target.baseUrl, [REMOVE_ORIGIN]));

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
    return withTemporaryHeaderRule(baseUrl, [REMOVE_ORIGIN], method);
}

export async function executeMethodWrappedWithReferer<T>(method: () => Promise<T>, url: string, referer: string): Promise<T> {
    return withTemporaryHeaderRule(url, [{ header: "Referer", operation: "set", value: referer }, REMOVE_ORIGIN], method);
}

async function withTemporaryHeaderRule<T>(
    urlPrefix: string, requestHeaders: HeaderModification[], method: () => Promise<T>,
): Promise<T> {
    const ruleId = allocateDynamicRuleId();
    await ext.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [createHeaderRule(ruleId, urlPrefix, requestHeaders)]
    });
    try {
        return await method();
    } finally {
        await ext.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ruleId] });
    }
}

// Rule ids only need to be distinct among the requests in flight within one worker lifetime, and every
// temporary rule removes its own id before adding it, so losing this counter on a restart is harmless.
let nextDynamicRuleId = 0;

function allocateDynamicRuleId(): number {
    nextDynamicRuleId = (nextDynamicRuleId % MAX_DYNAMIC_RULE_ID) + 1;
    return nextDynamicRuleId;
}

function createHeaderRule(id: number, urlPrefix: string, requestHeaders: HeaderModification[]): chrome.declarativeNetRequest.Rule {
    return {
        id,
        priority: HEADER_RULE_PRIORITY,
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
