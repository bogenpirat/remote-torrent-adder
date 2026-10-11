import { type vi } from "vitest";
import { Client } from "../../src/models/clients";
import { type RTASettings } from "../../src/models/settings";
import { type WebUISettings } from "../../src/models/webui";
import { serializeSettings } from "../../src/util/serializer";
import { SETTINGS_KEY } from "../../src/util/settings";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { mockResponse, queueFetch } from "./fetch-mock";
import { makeWebUISettings } from "./fixtures";

/** Stores one qBittorrent WebUI with the id "w1" as the only configured client. */
export function seedSingleWebUi(webUiOverrides: Partial<WebUISettings> = {}, settingsOverrides: Partial<RTASettings> = {}): void {
    const webUiSettings = makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, ...webUiOverrides });
    const settings = { ...getDefaultSettings(), webuiSettings: [webUiSettings], ...settingsOverrides };
    (chrome as any).__storage[SETTINGS_KEY] = serializeSettings(settings);
}

/** Makes every request to the client succeed, the way qBittorrent answers a login and an add. */
export function stubClientAccepts(): ReturnType<typeof vi.fn> {
    return queueFetch(mockResponse({ body: "Ok." }));
}

/** Lets the fire-and-forget promise chains of the add flow run to completion. */
export function settle(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}
