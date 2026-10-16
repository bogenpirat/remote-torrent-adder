import { type RTASettings } from "../../src/models/settings";
import { type WebUISettings } from "../../src/models/webui";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { makeWebUISettings as makeUnitTestWebUISettings } from "../../test/helpers/fixtures";

export function makeWebUISettings(overrides: Partial<WebUISettings> = {}): WebUISettings {
    return makeUnitTestWebUISettings({ host: "127.0.0.1", ...overrides });
}

/** Settings holding the two WebUIs the multi-client specs share. */
export function makeTwoWebUiSettings(): RTASettings {
    return makeSettings([
        makeWebUISettings({ id: "webui-1", name: "First", host: "127.0.0.1", port: 8080 }),
        makeWebUISettings({ id: "webui-2", name: "Second", host: "10.0.0.5", port: 9091 }),
    ]);
}

/** Settings whose only WebUI is a fake client the spec started itself. */
export function makeFakeClientSettings(overrides: Partial<WebUISettings>): RTASettings {
    return makeSettings([makeWebUISettings({ name: "Fake qBittorrent", ...overrides })]);
}

export function makeSettings(webuiSettings: WebUISettings[] = [], overrides: Partial<RTASettings> = {}): RTASettings {
    return {
        ...getDefaultSettings(),
        webuiSettings,
        ...overrides,
    };
}
