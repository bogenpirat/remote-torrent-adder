import { WebUIFactory } from "../models/clients";
import { type RTASettings } from "../models/settings";
import { type TorrentWebUI } from "../models/webui";
import { Settings } from "./settings";

export async function initiateWebUis(settings: RTASettings): Promise<TorrentWebUI[]> {
    return settings.webuiSettings
        .filter(webUiSettings => WebUIFactory.supports(webUiSettings.client))
        .map(webUiSettings => WebUIFactory.createWebUI(webUiSettings));
}

export async function loadWebUis(): Promise<TorrentWebUI[]> {
    return initiateWebUis(await new Settings().loadSettings());
}
