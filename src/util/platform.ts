import { ext } from "./browser-api";

declare const __RTA_BROWSER__: "chrome" | "firefox";

export type BrowserTarget = "chrome" | "firefox";

export const BROWSER: BrowserTarget = typeof __RTA_BROWSER__ === "string" ? __RTA_BROWSER__ : "chrome";

export function isFirefox(): boolean {
    return BROWSER === "firefox";
}

export function canUseOffscreen(): boolean {
    return BROWSER === "chrome" && typeof ext.offscreen !== "undefined";
}
