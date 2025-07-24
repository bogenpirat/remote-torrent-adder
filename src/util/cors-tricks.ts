export async function registerWebUiCorsCircumvention(torrentWebUiUrls: string[]): Promise<void> {
    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: (await chrome.declarativeNetRequest.getSessionRules()).map(rule => rule.id)
    });

    torrentWebUiUrls.forEach((url, index) => {
        const rule: chrome.declarativeNetRequest.Rule = {
            id: index + 1,
            priority: index + 1,
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'Origin',
                        value: url
                    },
                    {
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'Referer',
                        value: url
                    },
                ],
            },
            condition: {
                urlFilter: `${url}*`,
                resourceTypes: ['xmlhttprequest'],
            },
        };
        chrome.declarativeNetRequest.updateSessionRules({ addRules: [rule] });
    });
}
