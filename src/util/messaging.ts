import { AddTorrentMessage, GetSettingsMessage, IAddTorrentMessage, IPreAddTorrentMessage, PreAddTorrentMessage } from "../models/messages";
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
            dispatchPreAddTorrent(message as IPreAddTorrentMessage, allWebUis);
        }
    });
}

export function registerAddTorrentDispatcher(allWebUis: TorrentWebUI[]): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === AddTorrentMessage.action) {
            const addTorrentMessage = message as IAddTorrentMessage;
            const webUi: TorrentWebUI = getWebUiById(addTorrentMessage.webUiId, allWebUis);
            if (webUi) {
                // TODO: activate the popup, send a message to it for selecting label/dir/whatever to build the TorrentUploadConfig
                downloadTorrent(addTorrentMessage.url).then(torrent => webUi.sendTorrent(torrent, addTorrentMessage.config || {}));
            } else {
                console.error("No WebUI found for addTorrentMessage:", addTorrentMessage);
            }
        }
    });
}

export function dispatchPreAddTorrent(message: IPreAddTorrentMessage, allWebUis: TorrentWebUI[]): void {
    const webUi: TorrentWebUI = getWebUiById(message.webUiId, allWebUis) || allWebUis.length > 0 ? allWebUis[0] : null;
    if (webUi && webUi.settings.showPerTorrentConfigSelector) {
        // TODO: activate the popup, send a message to it for selecting label/dir/whatever to build the TorrentUploadConfig
        // TODO: the popup script should then only send AddTorrentMessages
        //chrome.runtime.sendMessage({});
    } else if (webUi) {
        // TODO: populate some default TorrentUploadConfig
        downloadTorrent(message.url).then(torrent => webUi.sendTorrent(torrent, {}));
    } else {
        console.error("No WebUI found for preAddTorrentMessage:", message);
    }

}


function getWebUiById(webUiId: string, allWebUis: TorrentWebUI[]): TorrentWebUI | null {
    if (!webUiId) {
        return null;
    }

    return allWebUis.find(webUi => webUi.settings.id === webUiId) || null;
}