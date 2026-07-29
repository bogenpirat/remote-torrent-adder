export function generateId(): string {
    return crypto.randomUUID();
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) {
        return items;
    }
    const reordered = [...items];
    const [item] = reordered.splice(from, 1);
    if (item === undefined) {
        return items;
    }
    reordered.splice(to, 0, item);
    return reordered;
}

export function isMatchedByRegexes(url: string, regexes: RegExp[]): boolean {
    return regexes.some(regex => regex.test(url));
}

export function getBaseUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin;
    } catch (e) {
        return '';
    }
}

export function addTrailingSlash(url: string): string {
    if (!url.endsWith("/")) {
        return url + "/";
    }
    return url;
}

export function clearDynamicRules(): void {
    chrome.declarativeNetRequest.getDynamicRules().then(rules => {
        const ruleIds = rules.map(rule => rule.id);
        if (ruleIds.length > 0) {
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIds
            });
        }
    });
}