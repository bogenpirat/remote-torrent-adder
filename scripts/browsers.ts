export const BROWSERS = ['chrome', 'firefox'];
export const DEFAULT_BROWSER = 'chrome';

export const ALL_TARGETS = ['worker', 'content-script', 'popup', 'options', 'notifications'];

export function targetsFor(browser: string) {
    return browser === 'firefox'
        ? ALL_TARGETS.filter(target => target !== 'notifications')
        : ALL_TARGETS;
}

export function devDistDir(browser: string) {
    return `dist/${browser}`;
}

export function prodDistDir(browser: string) {
    return `dist-prod/${browser}`;
}

export function parseBrowser(value: string | undefined) {
    const browser = value ?? DEFAULT_BROWSER;
    if (!BROWSERS.includes(browser)) {
        throw new Error(`RTA_BROWSER must be one of: ${BROWSERS.join(', ')} (got ${value})`);
    }
    return browser;
}
