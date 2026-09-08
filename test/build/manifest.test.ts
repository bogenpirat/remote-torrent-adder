import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildManifest, GECKO, GECKO_UNLISTED, SOURCE_MANIFEST, UPDATE_MANIFEST_URL } from "../../scripts/generate-manifest.mjs";

const base = JSON.parse(readFileSync(SOURCE_MANIFEST, "utf8")) as Record<string, any>;
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

const chrome = buildManifest(base, "chrome") as Record<string, any>;
const firefox = buildManifest(base, "firefox") as Record<string, any>;
const unlisted = buildManifest(base, "firefox", { unlisted: true }) as Record<string, any>;

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

describe("the self-hosted Firefox manifest", () => {
    it("carries the unlisted AMO identity", () => {
        expect(unlisted.browser_specific_settings.gecko.id).toBe(GECKO_UNLISTED.id);
        expect(unlisted.browser_specific_settings.gecko.id).not.toBe(GECKO.id);
    });

    it("points at the update manifest so installs can self-update", () => {
        expect(unlisted.browser_specific_settings.gecko.update_url).toBe(UPDATE_MANIFEST_URL);
    });

    it("leaves update_url off the listed build, which AMO rejects", () => {
        expect(firefox.browser_specific_settings.gecko.update_url).toBeUndefined();
    });

    it("distinguishes itself in about:addons", () => {
        expect(unlisted.name).toBe(`${base.name} (self-hosted)`);
        expect(firefox.name).toBe(base.name);
        expect(unlisted.short_name).toBe(base.short_name);
    });

    it("is otherwise identical to the listed Firefox build", () => {
        const { name: _n, browser_specific_settings: _b, ...restUnlisted } = unlisted;
        const { name: _n2, browser_specific_settings: _b2, ...restFirefox } = firefox;
        expect(restUnlisted).toEqual(restFirefox);
    });
});
