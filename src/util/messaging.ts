import {
    AddTorrentMessage,
    GetPreAddedTorrentAndSettings,
    GetPreAddedTorrentAndSettingsResponse,
    GetSettingsMessage,
    IAddTorrentMessage,
    IGetPreAddedTorrentAndSettingsResponse,
    IPreAddTorrentMessage,
    PreAddTorrentMessage,
    AddTorrentMessageWithLabelAndDir
} from "../models/messages";
import { RTASettings } from "../models/settings";
import { SerializedTorrent, Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentWebUI, WebUISettings } from "../models/webui";
import { downloadTorrent } from "./download";
import { serializeSettings, convertTorrentToSerialized, convertSerializedToTorrent } from "./serializer";
import { Settings } from "./settings";



const POPUP_PAGE = "popup/popup.html";
let bufferedTorrent: BufferedTorrentDataForPopup | null = null;


export function registerMessageListener(settings: RTASettings, allWebUis: TorrentWebUI[], settingsProvider: Settings): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.debug(`Received message of type ${message.action}:`, message, sender);

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
        } else if (message.action === AddTorrentMessageWithLabelAndDir.action) {
            const webUi = getWebUiById(message.webUiId, allWebUis);
            const torrent = convertSerializedToTorrent(message.serializedTorrent);
            webUi.sendTorrent(torrent, message.config);
            updateWebUiSettingsForWebUi(settingsProvider, message.webUiId, message.labels, message.directories);
            sendResponse({});
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
        chrome.action.setPopup({ popup: POPUP_PAGE });
        chrome.action.openPopup({ windowId: windowId });
        chrome.action.setPopup({ popup: "" });
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

function updateWebUiSettingsForWebUi(settingsProvider: Settings, webUiId: string, labels: string[], directories: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        settingsProvider.loadSettings().then(settings => {
            const webUiSettings = settings.webuiSettings.find(webUi => webUi.id === webUiId);
            if (webUiSettings) {
                webUiSettings.labels = labels;
                webUiSettings.dirs = directories;
                settingsProvider.saveSettings(settings).then(() => {
                    resolve();
                });
            } else {
                const message = `WebUI with id ${webUiId} not found in settings; couldn't update labels and directories.`;
                console.error(message);
                reject(new Error(message));
            }
        });
    });
}
