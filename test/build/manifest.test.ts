import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildManifest, GECKO, SOURCE_MANIFEST } from "../../scripts/generate-manifest.mjs";

const base = JSON.parse(readFileSync(SOURCE_MANIFEST, "utf8")) as Record<string, any>;
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

const chrome = buildManifest(base, "chrome") as Record<string, any>;
const firefox = buildManifest(base, "firefox") as Record<string, any>;

describe("generated manifests", () => {
    it("emits the source manifest verbatim for Chrome", () => {
        expect(chrome).toEqual(base);
    });

    it("carries every Chrome permission except the Chrome-only ones into Firefox", () => {
        const missing = (base.permissions as string[]).filter(p => !(firefox.permissions as string[]).includes(p));
        expect(missing).toEqual(["offscreen"]);
    });

    it("runs the background as an event page on Firefox", () => {
        expect(firefox.background).toEqual({ scripts: [base.background.service_worker] });
        expect(firefox.background.service_worker).toBeUndefined();
    });

    it("keeps the Chrome background as a service worker", () => {
        expect(chrome.background).toEqual({ service_worker: "service_worker.js" });
    });

    it("opens the Firefox options page in a tab so it looks like Chrome's", () => {
        expect(firefox.options_ui).toEqual({ page: base.options_page, open_in_tab: true });
        expect(firefox.options_page).toBeUndefined();
    });

    it("declares the AMO identity on Firefox only", () => {
        expect(firefox.browser_specific_settings.gecko.id).toBe(GECKO.id);
        expect(firefox.browser_specific_settings.gecko.strict_min_version).toBe("149.0");
        expect(firefox.browser_specific_settings.gecko.data_collection_permissions).toEqual({ required: ["none"] });
        expect(chrome.browser_specific_settings).toBeUndefined();
    });

    it("keeps the content scripts and host permissions identical", () => {
        expect(firefox.content_scripts).toEqual(base.content_scripts);
        expect(firefox.host_permissions).toEqual(base.host_permissions);
    });

    it("keeps the manifest version in step with package.json", () => {
        expect(base.version).toBe(pkg.version);
        expect(firefox.version).toBe(pkg.version);
    });
});
