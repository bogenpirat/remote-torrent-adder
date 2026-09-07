export const BROWSERS = ['chrome', 'firefox'];
export const DEFAULT_BROWSER = 'chrome';

export const ALL_TARGETS = ['worker', 'content-script', 'popup', 'options', 'notifications'];

/**
 * Firefox's MV3 background is an event page with a DOM, so it plays notification
 * sounds in-process and never loads the offscreen document.
 * @param {string} browser
 */
export function targetsFor(browser) {
    return browser === 'firefox'
        ? ALL_TARGETS.filter(target => target !== 'notifications')
        : ALL_TARGETS;
}

/**
 * @param {string} browser
 * @param {boolean} isProd
 */
export function distDirFor(browser, isProd) {
    return `${isProd ? 'dist-prod' : 'dist'}/${browser}`;
}

/** @param {string | undefined} value */
export function parseBrowser(value) {
    const browser = value ?? DEFAULT_BROWSER;
    if (!BROWSERS.includes(browser)) {
        throw new Error(`RTA_BROWSER must be one of: ${BROWSERS.join(', ')} (got ${value})`);
    }
    return browser;
}
