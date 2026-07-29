import { WebUIFactory } from "../models/clients";
import { type RTASettings } from "../models/settings";
import { type TorrentWebUI } from "../models/webui";
import { Settings } from "./settings";

export async function initiateWebUis(settings: RTASettings): Promise<TorrentWebUI[]> {
    const allWebUis = settings.webuiSettings.map(webUiSettings => WebUIFactory.createWebUI(webUiSettings)).filter(webUi => webUi !== null);
    return allWebUis;
}

export async function loadWebUis(): Promise<TorrentWebUI[]> {
    return initiateWebUis(await new Settings().loadSettings());
}
