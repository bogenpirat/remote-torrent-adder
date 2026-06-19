/**
 * Small runtime helpers to bridge the differences between the Chromium and
 * Firefox (Gecko) WebExtension implementations.
 *
 * The codebase targets Manifest V3 and uses the `chrome.*` namespace, which
 * Firefox aliases to `browser.*`. Most APIs behave identically, but a few have
 * to be branched at runtime:
 *
 *  - Firefox has no `chrome.offscreen` API. Its MV3 background runs as a
 *    DOM-capable event page, so audio can be played directly instead.
 *  - `chrome.action.openPopup()` in Firefox requires a user gesture, so the
 *    per-torrent config selector falls back to a separate popup window.
 */

/** True when running inside Firefox / Gecko. */
export function isFirefox(): boolean {
    try {
        return chrome.runtime.getURL("").startsWith("moz-extension://");
    } catch {
        return false;
    }
}

/**
 * True when the `offscreen` API is available (Chromium MV3). When false, the
 * background context can use DOM APIs (e.g. `Audio`) directly.
 */
export function hasOffscreenApi(): boolean {
    return typeof chrome.offscreen !== "undefined";
}
