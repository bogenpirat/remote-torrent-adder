import { ext } from "./browser-api";

declare const __RTA_BROWSER__: "chrome" | "firefox";

export type BrowserTarget = "chrome" | "firefox";

// Vite folds __RTA_BROWSER__ to a literal in every target. The typeof guard is
// what keeps this module usable under vitest, which does not bundle.
export const BROWSER: BrowserTarget = typeof __RTA_BROWSER__ === "string" ? __RTA_BROWSER__ : "chrome";

export function isFirefox(): boolean {
    return BROWSER === "firefox";
}

// Chrome-only API. Firefox's background is an event page with a DOM, so it
// plays sound in-process instead of spawning an offscreen document.
export function canUseOffscreen(): boolean {
    return BROWSER === "chrome" && typeof ext.offscreen !== "undefined";
}
