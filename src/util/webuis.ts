import { WebUIFactory } from "../models/clients";
import { RTASettings } from "../models/settings";
import { TorrentWebUI } from "../models/webui";

export async function initiateWebUis(settings: RTASettings): Promise<TorrentWebUI[]> {
    const allWebUis = settings.webuiSettings.map(webUiSettings => WebUIFactory.createWebUI(webUiSettings)).filter(webUi => webUi !== null);
    return allWebUis;
}
