import {
    AddTorrentMessage,
    GetSettingsMessage,
    GetLinkCatchingConfig,
    type IAddTorrentMessage,
    type IAddTorrentMessageWithLabelAndDir,
    type IPreAddTorrentMessage,
    PreAddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    UpdateActionBadgeText,
    SaveSettingsMessage,
    type IUpdateActionBadgeTextMessage,
    TestNotificationMessage,
    TestConnectionMessage,
    type ITestConnectionMessage,
    type ISaveSettingsMessage,
    type ITestNotificationMessage,
    type IMessagable
} from "../models/messages";
import { type RTASettings } from "../models/settings";
import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, type TorrentWebUI, type WebUISettings } from "../models/webui";
import { WebUIFactory } from "../models/clients";
import { openActionPopup, POPUP_PAGE, updateBadgeText } from "./action";
import { getAutoDirResult, getAutoLabelResult, isAutoLabelDirEnabled } from "./auto-label-dir-matcher";
import { executeMethodWrappedWithOriginStripped } from "./cors-tricks";
import { CloudflareChallengeError, downloadTorrent, type TorrentDownloadContext } from "./download";
import { showNotification } from "./notifications";
import { serializeSettings, serializeObject, deserializeSettings } from "./serializer";
import { clearBufferedTorrent, readBufferedTorrent, saveBufferedTorrent } from "./buffered-torrent";
import { Settings } from "./settings";
import { addTrailingSlash } from "./utils";
import { initiateWebUis } from "./webuis";


export function registerMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: IMessagable, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
        let willRespondAsync = false;

        const finish = (payload?: unknown) => {
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
                    const saveSettingsMessage = message as ISaveSettingsMessage & { settings: string };
                    settingsProvider.saveSettings(deserializeSettings(saveSettingsMessage.settings)!)
                        .then(() => finish({}))
                        .catch(respondWithError);
                    break;
                }
                case TestNotificationMessage.action: {
                    const testNotificationMessage = message as ITestNotificationMessage;
                    showNotification(
                        testNotificationMessage.title,
                        testNotificationMessage.message,
                        testNotificationMessage.isFailed,
                        testNotificationMessage.popupDurationMs,
                        testNotificationMessage.playSound
                    );
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
                    const preAddTorrentMessage = message as IPreAddTorrentMessage;
                    chrome.windows.getLastFocused().then(lastFocusedWindow => {
                        try {
                            dispatchPreAddTorrent(
                                preAddTorrentMessage,
                                sender.tab?.windowId ?? lastFocusedWindow.id ?? 0,
                                resolveDownloadContext(preAddTorrentMessage, sender)
                            );
                            finish({});
                        } catch (e) { respondWithError(e); }
                    }).catch(respondWithError);
                    break;
                }
                case AddTorrentMessage.action: {
                    willRespondAsync = true;
                    const addTorrentMessage = message as IAddTorrentMessage;
                    addTorrentToWebUiById(
                        addTorrentMessage.webUiId,
                        addTorrentMessage.url,
                        addTorrentMessage.config,
                        resolveDownloadContext(addTorrentMessage, sender)
                    )
                        .then(() => finish({}))
                        .catch(respondWithError);
                    break;
                }
                case AddTorrentMessageWithLabelAndDir.action: {
                    willRespondAsync = true;
                    addBufferedTorrent(message as IAddTorrentMessageWithLabelAndDir, settingsProvider)
                        .then(() => finish({}))
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

export function resolveDownloadContext(message: IPreAddTorrentMessage, sender: chrome.runtime.MessageSender): TorrentDownloadContext {
    const senderPageUrl = sender.tab ? sender.url ?? sender.tab.url ?? null : null;
    return {
        tabId: sender.tab?.id ?? message.tabId ?? null,
        frameId: (sender.tab ? sender.frameId : message.frameId) ?? 0,
        pageUrl: senderPageUrl ?? message.pageUrl ?? null
    };
}

export async function dispatchPreAddTorrent(message: IPreAddTorrentMessage, windowId: number, context: TorrentDownloadContext = {}): Promise<void> {
    const settingsProvider = new Settings();
    const allWebUis = await getAllWebUis(settingsProvider);
    const webUiById = await getWebUiById(message.webUiId ?? "", settingsProvider);
    const webUi = webUiById ?? allWebUis[0] ?? null;
    if (webUi && webUi.settings.showPerTorrentConfigSelector) {
        let torrent: Torrent;
        try {
            torrent = await downloadTorrent(message.url, context);
        } catch (error) {
            console.error("Error downloading torrent:", error);
            notifyDownloadFailure(error, await settingsProvider.loadSettings(), addTrailingSlash(webUi.createBaseUrl()));
            return;
        }
        await saveBufferedTorrent({ torrent, webUiSettings: webUi.settings });
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
            openActionPopup(windowId);
        }
    } else {
        downloadAndAddTorrentToWebUi(webUi, message.url, null, message, context);
    }
}


export async function addTorrentToWebUiById(webUiId: string, url: string, config: TorrentUploadConfig | null, context: TorrentDownloadContext = {}): Promise<void> {
    const webUi = await getWebUiById(webUiId, new Settings());
    downloadAndAddTorrentToWebUi(webUi, url, config, { action: AddTorrentMessage.action, url, webUiId } as IPreAddTorrentMessage, context);
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

function downloadAndAddTorrentToWebUi(webUi: TorrentWebUI | null, url: string, config: TorrentUploadConfig | null, message: IPreAddTorrentMessage, context: TorrentDownloadContext = {}): void {
    new Settings().loadSettings().then(settings => {
        if (webUi) {
            downloadTorrent(url, context).then(torrent => {
                const autoEnabled = isAutoLabelDirEnabled(webUi.settings);
                const fallbackConfig: TorrentUploadConfig = {
                    addPaused: webUi.settings.addPaused,
                    dir: (autoEnabled ? getAutoDirResult(torrent, webUi._settings.autoLabelDirSettings) : null) ?? webUi.settings.defaultDir ?? undefined,
                    label: (autoEnabled ? getAutoLabelResult(torrent, webUi._settings.autoLabelDirSettings) : null) ?? webUi.settings.defaultLabel ?? undefined
                };

                sendTorrentToWebUi(webUi, torrent, config ?? fallbackConfig);
            }).catch(error => {
                console.error("Error downloading torrent:", error);
                notifyDownloadFailure(error, settings, addTrailingSlash(webUi.createBaseUrl()));
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

function notifyDownloadFailure(error: unknown, settings: RTASettings, webUiUrl: string): void {
    if (error instanceof CloudflareChallengeError) {
        showNotification("Cloudflare is blocking this download",
            error.message,
            true,
            settings.notificationsDurationMs,
            settings.notificationsSoundEnabled,
            error.challengeUrl);
        return;
    }

    showNotification("Error downloading torrent",
        `Error: ${error}`,
        true,
        settings.notificationsDurationMs,
        settings.notificationsSoundEnabled,
        webUiUrl);
}

/**
 * Completes the flow the popup started: the torrent itself is still sitting in
 * IndexedDB where `dispatchPreAddTorrent` parked it, so the popup only has to
 * say which WebUI and which label/dir the user picked.
 */
async function addBufferedTorrent(message: IAddTorrentMessageWithLabelAndDir, settingsProvider: Settings): Promise<void> {
    const buffered = await readBufferedTorrent();
    if (!buffered) {
        throw new Error("No buffered torrent to add; it may already have been consumed.");
    }

    const webUi = await getWebUiById(message.webUiId, settingsProvider);
    if (!webUi) {
        throw new Error(`No WebUI found for id ${message.webUiId}`);
    }

    sendTorrentToWebUi(webUi, buffered.torrent, message.config);
    await clearBufferedTorrent();
    await updateWebUiSettingsForWebUi(settingsProvider, message.webUiId, message.labels, message.directories)
        .catch(e => console.error("Failed updating labels/dirs", e));
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
