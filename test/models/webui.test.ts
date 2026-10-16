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
}

const build = (over = {}) => new TestWebUI(makeWebUISettings(over));

describe("createBaseUrl", () => {
    it.each([
        ["builds a plain http url with explicit port", { port: 8080, secure: false }, "http://h:8080"],
        ["builds an https url", { port: 8443, secure: true }, "https://h:8443"],
        ["omits port 80 for insecure connections", { port: 80, secure: false }, "http://h"],
        ["omits port 443 for secure connections", { port: 443, secure: true }, "https://h"],
        ["keeps port 443 when not secure", { port: 443, secure: false }, "http://h:443"],
    ])("%s", (_title, endpoint, expectedUrl) => {
        expect(build({ host: "h", ...endpoint }).createBaseUrl()).toBe(expectedUrl);
    });

    it("omits the port entirely when none is configured", () => {
        expect(build({ host: "h", port: null, secure: false }).createBaseUrl()).toBe("http://h");
        expect(build({ host: "h", port: null, secure: true }).createBaseUrl()).toBe("https://h");
    });

    it("appends a normalized relative path", () => {
        expect(build({ host: "h", port: 80, secure: false, relativePath: "rutorrent/" }).createBaseUrl()).toBe(
            "http://h/rutorrent",
        );
    });
});

describe("config resolution helpers", () => {
    it("getDirectory prefers config, then default, then nothing", () => {
        expect(build({ defaultDir: "/def" }).publicGetDirectory({ dir: "/cfg" })).toBe("/cfg");
        expect(build({ defaultDir: "/def" }).publicGetDirectory({})).toBe("/def");
        expect(build({ defaultDir: null }).publicGetDirectory({})).toBeUndefined();
    });

    it("getLabel prefers config, then default, then nothing", () => {
        expect(build({ defaultLabel: "def" }).publicGetLabel({ label: "cfg" })).toBe("cfg");
        expect(build({ defaultLabel: "def" }).publicGetLabel({})).toBe("def");
        expect(build({ defaultLabel: null }).publicGetLabel({})).toBeUndefined();
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
