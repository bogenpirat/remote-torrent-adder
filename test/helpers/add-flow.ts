import { type vi } from "vitest";
import { Client } from "../../src/models/clients";
import { type RTASettings } from "../../src/models/settings";
import { type WebUISettings } from "../../src/models/webui";
import { serializeSettings } from "../../src/util/serializer";
import { SETTINGS_KEY } from "../../src/util/settings";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { showNotification } from "./add-flow-mocks";
import { callArgs } from "./assert";
import { mockResponse, queueFetch } from "./fetch-mock";
import { makeWebUISettings } from "./fixtures";

export const SEEDED_WEBUI_ID = "w1";
export const MAGNET_URL = "magnet:?x";
export const TRACKER_URL = "https://tracker.org/get/1.torrent";

export function seedSingleWebUi(webUiOverrides: Partial<WebUISettings> = {}, settingsOverrides: Partial<RTASettings> = {}): void {
    const webUiSettings = makeWebUISettings({ id: SEEDED_WEBUI_ID, client: Client.QBittorrentWebUI, ...webUiOverrides });
    const settings = { ...getDefaultSettings(), webuiSettings: [webUiSettings], ...settingsOverrides };
    (chrome as any).__storage[SETTINGS_KEY] = serializeSettings(settings);
}

export function stubClientAccepts(): ReturnType<typeof vi.fn> {
    return queueFetch(mockResponse({ body: "Ok." }));
}

export function shownNotification(index = 0) {
    const { title, message, kind, clickUrl } = callArgs(showNotification, index)[0];
    return { title, message, kind, clickUrl };
}

export function uploadRequestBody(fetchMock: ReturnType<typeof vi.fn>): FormData {
    const uploadCall = fetchMock.mock.calls.find(fetchCall => String(fetchCall[0]).includes("/torrents/add"));
    if (!uploadCall) {
        throw new Error(`Expected a torrent upload, but ${fetchMock.mock.calls.length} other request(s) were made`);
    }
    return uploadCall[1].body as FormData;
}

export function settle(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}
