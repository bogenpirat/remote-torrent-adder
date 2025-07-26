export async function registerCorsCircumventionWithDeclarativeNetRequest(torrentWebUiUrls: string[]): Promise<void> {
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(rule => rule.id)
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
                        header: 'Access-Control-Allow-Methods',
                        value: 'PUT, GET, HEAD, POST, DELETE, OPTIONS'
                    },
                    {
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'Access-Control-Allow-Origin',
                        value: '*'
                    },
                ],
            },
            condition: {
                urlFilter: `${url}*`,
                resourceTypes: ['xmlhttprequest'],
            },
        };
        console.log(`register listener for ${url}*`);
        chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rule] });
    });
}
