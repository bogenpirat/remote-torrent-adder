import { Client } from "../../src/models/clients";
import { type RTASettings } from "../../src/models/settings";
import { type WebUISettings } from "../../src/models/webui";
import { getDefaultSettings } from "../../src/util/settings-defaults";

export function makeWebUISettings(overrides: Partial<WebUISettings> = {}): WebUISettings {
    return {
        id: "webui-1",
        client: Client.QBittorrentWebUI,
        name: "My Client",
        host: "127.0.0.1",
        port: 8080,
        secure: false,
        relativePath: null,
        username: "user",
        password: "pass",
        showPerTorrentConfigSelector: false,
        defaultLabel: null,
        defaultDir: null,
        labels: [],
        dirs: [],
        addPaused: false,
        autoLabelDirSettings: [],
        clientSpecificSettings: {},
        ...overrides,
    };
}

export function makeSettings(webuiSettings: WebUISettings[] = [], overrides: Partial<RTASettings> = {}): RTASettings {
    return {
        ...getDefaultSettings(),
        webuiSettings,
        ...overrides,
    };
}
