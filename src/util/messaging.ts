import {
    AddTorrentMessage,
    GetPreAddedTorrentAndSettings,
    GetPreAddedTorrentAndSettingsResponse,
    GetSettingsMessage,
    GetLinkCatchingConfig,
    IAddTorrentMessage,
    IGetPreAddedTorrentAndSettingsResponse,
    IPreAddTorrentMessage,
    PreAddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    UpdateActionBadgeText,
    SaveSettingsMessage,
    IUpdateActionBadgeTextMessage,
    TestNotificationMessage,
    TestConnectionMessage,
    ITestConnectionMessage
} from "../models/messages";
import { SerializedTorrent, Torrent, TorrentUploadConfig } from "../models/torrent";
import { ConnectionTestResult, TorrentAddingResult, TorrentWebUI, WebUISettings } from "../models/webui";
import { WebUIFactory } from "../models/clients";
import { updateBadgeText } from "./action";
import { getAutoDirResult, getAutoLabelResult } from "./auto-label-dir-matcher";
import { executeMethodWrappedWithOriginStripped } from "./cors-tricks";
import { downloadTorrent } from "./download";
import { showNotification } from "./notifications";
import { serializeSettings, serializeObject, convertTorrentToSerialized, convertSerializedToTorrent, deserializeSettings } from "./serializer";
import { Settings } from "./settings";
import { addTrailingSlash } from "./utils";
import { initiateWebUis } from "./webuis";


const POPUP_PAGE = "popup/popup.html";
const BUFFERED_TORRENT_KEY = "bufferedTorrent";


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
                case GetLinkCatchingConfig.action: {
                    willRespondAsync = true;
                    settingsProvider.loadSettings()
                        .then(settings => finish(serializeObject({
                            linkCatchingEnabled: settings.linkCatchingEnabled,
                            linkCatchingRegexes: settings.linkCatchingRegexes,
                        })))
                        .catch(respondWithError);
                    break;
                }
                case SaveSettingsMessage.action: {
                    willRespondAsync = true;
                    settingsProvider.saveSettings(deserializeSettings(message.settings)!)
                        .then(() => finish({}))
                        .catch(respondWithError);
                    break;
                }
                case TestNotificationMessage.action: {
                    showNotification(message.title, message.message, message.isFailed, message.popupDurationMs, message.playSound);
                    finish({});
                    break;
                }
                case TestConnectionMessage.action: {
                    willRespondAsync = true;
                    testConnectionForWebUiSettings((message as ITestConnectionMessage).webUiSettings)
                        .then(finish)
                        .catch(respondWithError);
                    break;
                }
                case PreAddTorrentMessage.action: {
                    willRespondAsync = true;
                    chrome.windows.getLastFocused().then(lastFocusedWindow => {
                        try {
                            dispatchPreAddTorrent(message as IPreAddTorrentMessage, sender.tab?.windowId ?? lastFocusedWindow.id ?? 0);
                            finish({});
                        } catch (e) { respondWithError(e); }
                    }).catch(respondWithError);
                    break;
                }
                case AddTorrentMessage.action: {
                    willRespondAsync = true;
                    const addTorrentMessage = message as IAddTorrentMessage;
                    addTorrentToWebUiById(addTorrentMessage.webUiId, addTorrentMessage.url, addTorrentMessage.config)
                        .then(() => finish({}))
                        .catch(respondWithError);
                    break;
                }
                case GetPreAddedTorrentAndSettings.action: {
                    willRespondAsync = true;
                    getBufferedTorrent()
                        .then((buffered: BufferedTorrentForPopup | null) => {
                            if (!buffered) {
                                finish({ error: "no buffered torrent" });
                                return;
                            }
                            const response: IGetPreAddedTorrentAndSettingsResponse = {
                                action: GetPreAddedTorrentAndSettingsResponse.action,
                                webUiSettings: buffered.webUiSettings,
                                serializedTorrent: buffered.serializedTorrent,
                                autoLabelDirResult: getAutoLabelDirResultForConfig(buffered.serializedTorrent, buffered.webUiSettings)
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
    const webUiById = await getWebUiById(message.webUiId ?? "", settingsProvider);
    const webUi = webUiById ?? (allWebUis.length > 0 ? allWebUis[0] : null);
    if (webUi && webUi.settings.showPerTorrentConfigSelector) {
        const torrent = await downloadTorrent(message.url);
        await setBufferedTorrent({
            serializedTorrent: await convertTorrentToSerialized(torrent),
            webUiSettings: webUi.settings
        });
        if (webUi.settings.useAlternativeLabelDirChooser) {
            chrome.windows.create({
                url: POPUP_PAGE,
                type: "popup",
                width: 420,
                height: 600,
                focused: true
            });
        } else {
            chrome.windows.update(windowId, { focused: true });
            chrome.action.setPopup({ popup: POPUP_PAGE });
            chrome.action.openPopup({ windowId: windowId }).then(() => chrome.action.setPopup({ popup: "" }));
        }
    } else {
        downloadAndAddTorrentToWebUi(webUi, message.url, null, message);
    }
}


export async function addTorrentToWebUiById(webUiId: string, url: string, config: TorrentUploadConfig | null): Promise<void> {
    const webUi = await getWebUiById(webUiId, new Settings());
    downloadAndAddTorrentToWebUi(webUi, url, config, { action: AddTorrentMessage.action, url, webUiId } as IPreAddTorrentMessage);
}

async function testConnectionForWebUiSettings(webUiSettings: WebUISettings): Promise<ConnectionTestResult> {
    const webUi = WebUIFactory.createWebUI(webUiSettings);
    if (!webUi) {
        return { reachable: false, authenticated: null, httpResponseCode: 0, message: "No client selected for this WebUI." };
    }
    return executeMethodWrappedWithOriginStripped(() => webUi.testConnection(), webUi.createBaseUrl());
}

async function getAllWebUis(settingsProvider: Settings): Promise<TorrentWebUI[]> {
    return new Promise((resolve) => {
        settingsProvider.loadSettings().then(async (settings) => {
            resolve(await initiateWebUis(settings));
        });
    });
}

async function getWebUiById(webUiId: string, settingsProvider: Settings): Promise<TorrentWebUI | null> {
    if (!webUiId) {
        return null;
    }

    const allWebUis = await getAllWebUis(settingsProvider);
    return allWebUis.find(webUi => webUi.settings.id === webUiId) ?? null;
}

function downloadAndAddTorrentToWebUi(webUi: TorrentWebUI | null, url: string, config: TorrentUploadConfig | null, message: IPreAddTorrentMessage): void {
    new Settings().loadSettings().then(settings => {
        if (webUi) {
            downloadTorrent(url).then(torrent => {
                const fallbackConfig: TorrentUploadConfig = {
                    addPaused: webUi.settings.addPaused,
                    dir: getAutoDirResult(torrent, webUi._settings.autoLabelDirSettings) ?? webUi.settings.defaultDir ?? undefined,
                    label: getAutoLabelResult(torrent, webUi._settings.autoLabelDirSettings) ?? webUi.settings.defaultLabel ?? undefined
                };

                sendTorrentToWebUi(webUi, torrent, config ?? fallbackConfig);
            }).catch(error => {
                console.error("Error downloading torrent:", error);
                showNotification("Error downloading torrent",
                            `Error: ${error}`,
                            true,
                            settings.notificationsDurationMs,
                            settings.notificationsSoundEnabled,
                            addTrailingSlash(webUi.createBaseUrl()));
            });
        } else {
            console.error("No WebUI found for addTorrentMessage:", message);
            showNotification("No WebUI configured",
                        `Check your settings.`,
                        true,
                        settings.notificationsDurationMs,
                        settings.notificationsSoundEnabled);
        }
    });
}

interface BufferedTorrentForPopup {
    serializedTorrent: SerializedTorrent;
    webUiSettings: WebUISettings;
}

function setBufferedTorrent(buffered: BufferedTorrentForPopup): Promise<void> {
    return chrome.storage.session.set({ [BUFFERED_TORRENT_KEY]: buffered });
}

async function getBufferedTorrent(): Promise<BufferedTorrentForPopup | null> {
    const stored = await chrome.storage.session.get(BUFFERED_TORRENT_KEY);
    return (stored[BUFFERED_TORRENT_KEY] as BufferedTorrentForPopup | undefined) ?? null;
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

function getAutoLabelDirResultForConfig(torrent: Torrent, webUiSettings: WebUISettings): { label?: string; directory?: string } {
    return {
        label: getAutoLabelResult(torrent, webUiSettings.autoLabelDirSettings) ?? undefined,
        directory: getAutoDirResult(torrent, webUiSettings.autoLabelDirSettings) ?? undefined
    };
}

function sendTorrentToWebUi(webUi: TorrentWebUI, torrent: Torrent, config: TorrentUploadConfig | null) {
    new Settings().loadSettings().then(settings => {
        const webUiUrl = addTrailingSlash(webUi.createBaseUrl());
        webUi.sendTorrent(torrent, config ?? {}).then((torrentAddingResult: TorrentAddingResult) => {
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
                        true,
                        settings.notificationsDurationMs,
                        settings.notificationsSoundEnabled,
                        webUiUrl);
                }
            }
        }).catch(error => {
            console.error("Error sending torrent:", error);
            showNotification("Torrent adding failed", `Error (${error.httpResponseCode}):\n${error.httpResponseBody}`, true, settings.notificationsDurationMs, settings.notificationsSoundEnabled, webUiUrl);
        });
    });
}
