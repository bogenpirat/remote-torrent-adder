import { GetSettingsMessage, IPreAddTorrentMessage, PreAddTorrentMessage } from "../models/messages";
import { RTASettings } from "../models/settings";
import { TorrentWebUI } from "../models/webui";
import { downloadTorrent } from "./download";
import { serializeSettings, deserializeSettings } from "./serializer";


export function registerSettingsMessageSender(settings: RTASettings): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === GetSettingsMessage.action) {
            sendResponse(serializeSettings(settings));
        }
    });
}

export function registerPreAddTorrentDispatcher(allWebUis: TorrentWebUI[]): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === PreAddTorrentMessage.action) {
            const preAddTorrentMessage = message as IPreAddTorrentMessage;
            const webUi: TorrentWebUI = getWebUiById(preAddTorrentMessage.webUiId, allWebUis);
            if (webUi && webUi.settings.showPerTorrentConfigSelector) {
                // TODO: activate the popup, send a message to it for selecting label/dir/whatever to build the TorrentUploadConfig
                // TODO: the popup script should then only send AddTorrentMessages
            } else if (webUi) {
                // TODO: populate some default TorrentUploadConfig
                downloadTorrent(preAddTorrentMessage.url).then(torrent => webUi.sendTorrent(torrent, {}));
            } else {
                console.error("No WebUI found for:", preAddTorrentMessage.webUiId);
            }
            
            sendResponse();
        }
    });
}


function getWebUiById(webUiId: string, allWebUis: TorrentWebUI[]): TorrentWebUI | null {
    if (!webUiId) {
        return null;
    }

    return allWebUis.find(webUi => webUi.settings.id === webUiId) || null;
}