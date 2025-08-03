import { AddTorrentMessage, GetPreAddedTorrentAndSettings, GetPreAddedTorrentAndSettingsResponse, GetSettingsMessage, IAddTorrentMessage, IGetPreAddedTorrentAndSettingsResponse, IPreAddTorrentMessage, PreAddTorrentMessage } from "../models/messages";
import { RTASettings } from "../models/settings";
import { SerializedTorrent, Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentWebUI, WebUISettings } from "../models/webui";
import { downloadTorrent } from "./download";
import { serializeSettings, convertTorrentToSerialized } from "./serializer";


let bufferedTorrent: BufferedTorrentDataForPopup | null = null;


export function registerMessageListener(settings: RTASettings, allWebUis: TorrentWebUI[]): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === GetSettingsMessage.action) {
            sendResponse(serializeSettings(settings));
        } else if (message.action === PreAddTorrentMessage.action) {
            chrome.windows.getLastFocused().then((lastFocusedWindow) => {
                dispatchPreAddTorrent(message as IPreAddTorrentMessage, allWebUis, sender.tab?.windowId ?? (lastFocusedWindow).id);
                sendResponse({});
            });
            return true;
        } else if (message.action === AddTorrentMessage.action) {
            const addTorrentMessage = message as IAddTorrentMessage;
            const webUi: TorrentWebUI = getWebUiById(addTorrentMessage.webUiId, allWebUis);
            downloadAndAddTorrentToWebUi(webUi, addTorrentMessage.url, addTorrentMessage.config || {}, addTorrentMessage);
            sendResponse({});
        } else if (message.action === GetPreAddedTorrentAndSettings.action) {
            convertTorrentToSerialized(bufferedTorrent.torrent).then((serializedTorrent: SerializedTorrent) => {
                const response: IGetPreAddedTorrentAndSettingsResponse = {
                    action: GetPreAddedTorrentAndSettingsResponse.action,
                    webUiSettings: bufferedTorrent.webUiSettings,
                    serializedTorrent: serializedTorrent,
                };
                sendResponse(response);
            });
            return true;
        }
    });
}

export async function dispatchPreAddTorrent(message: IPreAddTorrentMessage, allWebUis: TorrentWebUI[], windowId: number): Promise<void> {
    const webUi: TorrentWebUI = getWebUiById(message.webUiId, allWebUis) || allWebUis.length > 0 ? allWebUis[0] : null;
    if (webUi && webUi.settings.showPerTorrentConfigSelector) {
        bufferedTorrent = {
            torrent: await downloadTorrent(message.url),
            webUiSettings: webUi._settings
        };
        chrome.windows.update(windowId, { focused: true });
        chrome.action.openPopup({ windowId: windowId });
    } else {
        downloadAndAddTorrentToWebUi(webUi, message.url, {}, message);
    }
}


function getWebUiById(webUiId: string, allWebUis: TorrentWebUI[]): TorrentWebUI | null {
    if (!webUiId) {
        return null;
    }
    return allWebUis.find(webUi => webUi.settings.id === webUiId) || null;
}

function downloadAndAddTorrentToWebUi(webUi: TorrentWebUI, url: string, config: TorrentUploadConfig, message: IPreAddTorrentMessage): void {
    if (webUi) {
        downloadTorrent(url).then(torrent => webUi.sendTorrent(torrent, config));
    } else {
        console.error("No WebUI found for addTorrentMessage:", message);
    }
}

interface BufferedTorrentDataForPopup {
    torrent: Torrent;
    webUiSettings: WebUISettings;
}