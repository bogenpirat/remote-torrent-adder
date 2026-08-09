import { describe, it, expect } from "vitest";
import { TorrentWebUI } from "../../src/models/webui";
import type { ClientSpecificSettingDescriptor, TorrentAddingResult } from "../../src/models/webui";
import type { TorrentUploadConfig } from "../../src/models/torrent";
import { makeWebUISettings } from "../helpers/fixtures";

/**
 * Minimal concrete subclass that exposes the protected helpers so the base
 * class behaviour can be exercised directly.
 */
class TestWebUI extends TorrentWebUI {
    isLabelSupported = true;
    isDirSupported = true;
    isAddPausedSupported = true;

    override get clientSpecificSettingDescriptors(): ReadonlyArray<ClientSpecificSettingDescriptor> {
        return [
            { key: "flagOn", label: "Flag on", type: "boolean", default: true, perTorrent: true },
            { key: "flagOff", label: "Flag off", type: "boolean", default: false, perTorrent: false },
        ];
    }

    async sendTorrent(): Promise<TorrentAddingResult> {
        return { success: true, httpResponseCode: 200, httpResponseBody: null };
    }

    publicGetDirectory(config: TorrentUploadConfig) {
        return this.getDirectory(config);
    }
    publicGetLabel(config: TorrentUploadConfig) {
        return this.getLabel(config);
    }
    publicGetAddPaused(config: TorrentUploadConfig) {
        return this.getAddPaused(config);
    }
    publicGetClientSpecific(key: string, config: TorrentUploadConfig) {
        return this.getClientSpecific(key, config);
    }
    publicAddLeadingAndTrim(part: string) {
        return this.addLeadingAndTrimTrailingSlashes(part);
    }
    publicFetch(url: string, options?: RequestInit) {
        return this.fetch(url, options);
    }
}

const build = (over = {}) => new TestWebUI(makeWebUISettings(over));

describe("createBaseUrl", () => {
    it("builds a plain http url with explicit port", () => {
        expect(build({ host: "h", port: 8080, secure: false }).createBaseUrl()).toBe("http://h:8080");
    });

    it("builds an https url", () => {
        expect(build({ host: "h", port: 8443, secure: true }).createBaseUrl()).toBe("https://h:8443");
    });

    it("omits port 80 for insecure connections", () => {
        expect(build({ host: "h", port: 80, secure: false }).createBaseUrl()).toBe("http://h");
    });

    it("omits port 443 for secure connections", () => {
        expect(build({ host: "h", port: 443, secure: true }).createBaseUrl()).toBe("https://h");
    });

    it("keeps port 443 when not secure", () => {
        expect(build({ host: "h", port: 443, secure: false }).createBaseUrl()).toBe("http://h:443");
    });

    it("appends a normalized relative path", () => {
        expect(build({ host: "h", port: 80, secure: false, relativePath: "rutorrent/" }).createBaseUrl()).toBe(
            "http://h/rutorrent",
        );
    });
});

describe("createBaseUrlPatternForFilter", () => {
    it("ensures exactly one trailing slash", () => {
        expect(build({ host: "h", port: 80 }).createBaseUrlPatternForFilter()).toBe("http://h/");
    });

    it("normalizes a relative path to a single trailing slash", () => {
        const url = build({ host: "h", port: 80, relativePath: "app" }).createBaseUrlPatternForFilter();
        expect(url).toBe("http://h/app/");
    });
});

describe("addLeadingAndTrimTrailingSlashes", () => {
    it("returns empty string for empty input", () => {
        expect(build().publicAddLeadingAndTrim("")).toBe("");
    });

    it("adds a leading slash and trims trailing slashes", () => {
        expect(build().publicAddLeadingAndTrim("path/")).toBe("/path");
        expect(build().publicAddLeadingAndTrim("//a/b//")).toBe("/a/b");
    });
});

describe("config resolution helpers", () => {
    it("getDirectory prefers config, then default, then null", () => {
        expect(build({ defaultDir: "/def" }).publicGetDirectory({ dir: "/cfg" })).toBe("/cfg");
        expect(build({ defaultDir: "/def" }).publicGetDirectory({})).toBe("/def");
        expect(build({ defaultDir: null }).publicGetDirectory({})).toBeNull();
    });

    it("getLabel prefers config, then default, then null", () => {
        expect(build({ defaultLabel: "def" }).publicGetLabel({ label: "cfg" })).toBe("cfg");
        expect(build({ defaultLabel: "def" }).publicGetLabel({})).toBe("def");
        expect(build({ defaultLabel: null }).publicGetLabel({})).toBeNull();
    });

    it("getAddPaused prefers config, then default, then false", () => {
        expect(build({ addPaused: false }).publicGetAddPaused({ addPaused: true })).toBe(true);
        expect(build({ addPaused: true }).publicGetAddPaused({})).toBe(true);
        expect(build({ addPaused: false }).publicGetAddPaused({})).toBe(false);
    });

    it("getClientSpecific prefers config, then the stored setting, then the declared default", () => {
        const stored = { clientSpecificSettings: { flagOff: true } };
        expect(build(stored).publicGetClientSpecific("flagOff", { clientSpecificSettings: { flagOff: false } })).toBe(false);
        expect(build(stored).publicGetClientSpecific("flagOff", {})).toBe(true);
        expect(build({ clientSpecificSettings: {} }).publicGetClientSpecific("flagOff", {})).toBe(false);
        expect(build({ clientSpecificSettings: {} }).publicGetClientSpecific("flagOn", {})).toBe(true);
    });

    it("getClientSpecific lets a stored false override a default of true", () => {
        expect(build({ clientSpecificSettings: { flagOn: false } }).publicGetClientSpecific("flagOn", {})).toBe(false);
    });

    it("getClientSpecific returns false for a key no descriptor declares", () => {
        expect(build({ clientSpecificSettings: {} }).publicGetClientSpecific("unknown", {})).toBe(false);
    });

    it("getClientSpecific tolerates settings saved before clientSpecificSettings existed", () => {
        const settings = makeWebUISettings();
        delete (settings as Partial<typeof settings>).clientSpecificSettings;
        const ui = new TestWebUI(settings);

        expect(ui.publicGetClientSpecific("flagOn", {})).toBe(true);
        expect(ui.publicGetClientSpecific("flagOff", {})).toBe(false);
    });
});

describe("isLabelDirChooserSupported", () => {
    it("is true when any of label/dir/addPaused are supported", () => {
        const ui = build();
        ui.isLabelSupported = false;
        ui.isDirSupported = false;
        ui.isAddPausedSupported = true;
        expect(ui.isLabelDirChooserSupported).toBe(true);
    });

    it("is false when none are supported", () => {
        const ui = build();
        ui.isLabelSupported = false;
        ui.isDirSupported = false;
        ui.isAddPausedSupported = false;
        expect(ui.isLabelDirChooserSupported).toBe(false);
    });
});

describe("fetch", () => {
    it("returns the response when ok", async () => {
        (globalThis as any).fetch = async () => ({ ok: true, status: 200 });
        const res = await build().publicFetch("http://x");
        expect(res.status).toBe(200);
    });

    it("throws an HttpError carrying the status and body on a non-ok response", async () => {
        (globalThis as any).fetch = async () => ({ ok: false, status: 500, text: async () => "boom" });
        await expect(build().publicFetch("http://x")).rejects.toMatchObject({
            message: "HTTP error 500",
            status: 500,
            body: "boom",
        });
    });
});
