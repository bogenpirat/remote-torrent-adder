import {
    AddTorrentMessage,
    GetPreAddedTorrentAndSettings,
    GetPreAddedTorrentAndSettingsResponse,
    GetSettingsMessage,
    IAddTorrentMessage,
    IGetPreAddedTorrentAndSettingsResponse,
    IPreAddTorrentMessage,
    PreAddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    UpdateActionBadgeText,
    SaveSettingsMessage,
    IUpdateActionBadgeTextMessage,
    TestNotificationMessage
} from "../models/messages";
import { RTASettings } from "../models/settings";
import { SerializedTorrent, Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI, WebUISettings } from "../models/webui";
import { updateBadgeText } from "./action";
import { getAutoDirResult, getAutoLabelResult } from "./auto-label-dir-matcher";
import { downloadTorrent } from "./download";
import { showNotification } from "./notifications";
import { serializeSettings, convertTorrentToSerialized, convertSerializedToTorrent, deserializeSettings } from "./serializer";
import { Settings } from "./settings";
import { initiateWebUis } from "./webuis";


const POPUP_PAGE = "popup/popup.html";
let bufferedTorrent: BufferedTorrentDataForPopup | null = null;


export function registerMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        let willRespondAsync = false;

        const finish = (payload?: any) => {
            try { sendResponse(payload); } catch { /* channel maybe closed */ }
        };

        const respondWithError = (err: unknown) => {
            console.error("Message handling error", message?.action, err);
            finish({ error: (err as Error)?.message || String(err) });
        };

        try {
            if (!message || !message.action) {
                finish({ error: "missing action" });
                return false;
            }

            console.debug(`Received message of type ${message.action}:`, message, sender);
            const settingsProvider = new Settings();

            switch (message.action) {
                case GetSettingsMessage.action: {
                    willRespondAsync = true;
                    settingsProvider.loadSettings()
                        .then(settings => finish(serializeSettings(settings)))
                        .catch(respondWithError);
                    break;
                }
                case SaveSettingsMessage.action: {
                    willRespondAsync = true;
                    settingsProvider.saveSettings(deserializeSettings(message.settings))
                        .then(() => finish({}))
                        .catch(respondWithError);
                    break;
                }
                case TestNotificationMessage.action: {
                    showNotification(message.title, message.message, message.isFailed, message.popupDurationMs, message.playSound);
                    finish({});
                    break;
                }
                case PreAddTorrentMessage.action: {
                    willRespondAsync = true;
                    chrome.windows.getLastFocused().then(lastFocusedWindow => {
                        try {
                            dispatchPreAddTorrent(message as IPreAddTorrentMessage, sender.tab?.windowId ?? lastFocusedWindow.id);
                            finish({});
                        } catch (e) { respondWithError(e); }
                    }).catch(respondWithError);
                    break;
                }
                case AddTorrentMessage.action: {
                    willRespondAsync = true;
                    const addTorrentMessage = message as IAddTorrentMessage;
                    getWebUiById(addTorrentMessage.webUiId, settingsProvider)
                        .then(webUi => {
                            downloadAndAddTorrentToWebUi(webUi, addTorrentMessage.url, addTorrentMessage.config, addTorrentMessage);
                            finish({});
                        })
                        .catch(respondWithError);
                    break;
                }
                case GetPreAddedTorrentAndSettings.action: {
                    if (!bufferedTorrent) {
                        finish({ error: "no buffered torrent" });
                        break;
                    }
                    willRespondAsync = true;
                    convertTorrentToSerialized(bufferedTorrent.torrent)
                        .then((serializedTorrent: SerializedTorrent) => {
                            const response: IGetPreAddedTorrentAndSettingsResponse = {
                                action: GetPreAddedTorrentAndSettingsResponse.action,
                                webUiSettings: bufferedTorrent!.webUiSettings,
                                serializedTorrent: serializedTorrent,
                                autoLabelDirResult: getAutoLabelDirResultForConfig(bufferedTorrent!.torrent, bufferedTorrent!.webUiSettings)
                            };
                            console.debug("IGetPreAddedTorrentAndSettingsResponse:", response);
                            finish(response);
                        })
                        .catch(respondWithError);
                    break;
                }
                case AddTorrentMessageWithLabelAndDir.action: {
                    willRespondAsync = true;
                    const torrent = convertSerializedToTorrent(message.serializedTorrent);
                    getWebUiById(message.webUiId, settingsProvider)
                        .then(webUi => {
                            if (webUi) {
                                sendTorrentToWebUi(webUi, torrent, message.config);
                            } else {
                                console.error("No WebUI found for id", message.webUiId);
                            }
                            updateWebUiSettingsForWebUi(settingsProvider, message.webUiId, message.labels, message.directories)
                                .catch(e => console.error("Failed updating labels/dirs", e));
                            finish({});
                        })
                        .catch(respondWithError);
                    break;
                }
                case UpdateActionBadgeText.action: {
                    updateBadgeText((message as IUpdateActionBadgeTextMessage).text, sender.tab?.id || -1);
                    break;
                }
                default: {
                    finish({ error: `unknown action: ${message.action}` });
                }
            }
        } catch (err) {
            respondWithError(err);
        }

        return willRespondAsync;
    });
}

export async function dispatchPreAddTorrent(message: IPreAddTorrentMessage, windowId: number): Promise<void> {
    const settingsProvider = new Settings();
    const allWebUis = await getAllWebUis(settingsProvider);
    const webUiById = await getWebUiById(message.webUiId, settingsProvider);
    const webUi: TorrentWebUI = webUiById ?? (allWebUis.length > 0 ? allWebUis[0] : null);
    if (webUi && webUi.settings.showPerTorrentConfigSelector) {
        bufferedTorrent = {
            torrent: await downloadTorrent(message.url),
            webUiSettings: webUi.settings
        };
        chrome.windows.update(windowId, { focused: true });
        chrome.action.setPopup({ popup: POPUP_PAGE });
        chrome.action.openPopup({ windowId: windowId }).then(() => chrome.action.setPopup({ popup: "" }));
    } else {
        downloadAndAddTorrentToWebUi(webUi, message.url, null, message);
    }
}


async function getAllWebUis(settingsProvider: Settings): Promise<TorrentWebUI[]> {
    return new Promise((resolve) => {
        settingsProvider.loadSettings().then(async (settings) => {
            resolve(await initiateWebUis(settings));
        });
    });
}

async function getWebUiById(webUiId: string, settingsProvider: Settings): Promise<TorrentWebUI | null> {
    return new Promise((resolve) => {
        if (!webUiId) {
            resolve(null);
        }

        getAllWebUis(settingsProvider).then(allWebUis => {
            resolve(allWebUis.find(webUi => webUi.settings.id === webUiId) || null);
        });
    });
}

function downloadAndAddTorrentToWebUi(webUi: TorrentWebUI, url: string, config: TorrentUploadConfig | null, message: IPreAddTorrentMessage): void {
    if (webUi) {
        downloadTorrent(url).then(torrent => {
            const fallbackConfig: TorrentUploadConfig = {
                addPaused: webUi.settings.addPaused,
                dir: getAutoDirResult(torrent, webUi._settings.autoLabelDirSettings) ?? webUi.settings.defaultDir,
                label: getAutoLabelResult(torrent, webUi._settings.autoLabelDirSettings) ?? webUi.settings.defaultLabel
            };

            sendTorrentToWebUi(webUi, torrent, config ?? fallbackConfig);
        }).catch(error => {
            console.error("Error downloading torrent:", error);
        });
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

function getAutoLabelDirResultForConfig(torrent: Torrent, webUiSettings: WebUISettings): Record<string, string | undefined> {
    return {
        label: getAutoLabelResult(torrent, webUiSettings.autoLabelDirSettings),
        directory: getAutoDirResult(torrent, webUiSettings.autoLabelDirSettings)
    };
}

function sendTorrentToWebUi(webUi: TorrentWebUI, torrent: Torrent, config: TorrentUploadConfig | null) {
    new Settings().loadSettings().then(settings => {
        const webUiUrl = webUi.createBaseUrl();
        webUi.sendTorrent(torrent, config).then((torrentAddingResult: TorrentAddingResult) => {
            console.log(`Torrent sent successfully: ${torrent.name} to -> ${webUi.name}`);
            if (settings.notificationsEnabled) {
                if (torrentAddingResult.success) {
                    showNotification("Torrent added successfully",
                        `${torrent.name} successfully added to ${webUi.name}`,
                        false,
                        settings.notificationsDurationMs,
                        settings.notificationsSoundEnabled,
                        webUiUrl);
                } else {
                    showNotification("Torrent adding failed",
                        `HTTP Response code: ${torrentAddingResult.httpResponseCode}\nResponse body: ${torrentAddingResult.httpResponseBody}`,
                        false,
                        settings.notificationsDurationMs,
                        settings.notificationsSoundEnabled,
                        webUiUrl);
                }
            }
        }).catch(error => {
            console.error("Error sending torrent:", error);
            showNotification("Torrent adding failed", `Error: ${error}`, true, settings.notificationsDurationMs, settings.notificationsSoundEnabled, webUiUrl);
        });
    });
}
