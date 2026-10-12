import { ext } from "./browser-api";
import { type IAddTorrentMessageWithLabelAndDir, type IPreAddTorrentMessage } from "../models/messages";
import { type RTASettings } from "../models/settings";
import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult, type TorrentWebUI } from "../models/webui";
import { openActionPopup, openPopupWindow } from "./action";
import { getAutoDirResult, getAutoLabelResult } from "./auto-label-dir-matcher";
import { clearBufferedTorrent, readBufferedTorrent, saveBufferedTorrent } from "./buffered-torrent";
import { CloudflareChallengeError, downloadTorrent, type TorrentDownloadContext } from "./download";
import { type NotificationRequest, showNotification } from "./notifications";
import { Settings } from "./settings";
import { addTrailingSlash } from "./utils";
import { initiateWebUis } from "./webuis";

export interface AddTorrentByUrlRequest {
    webUiId: string;
    url: string;
    config: TorrentUploadConfig | null;
}

interface ChooserRequest {
    webUi: TorrentWebUI;
    url: string;
    windowId: number;
    context: TorrentDownloadContext;
}

interface Delivery {
    webUi: TorrentWebUI;
    torrent: Torrent;
    settings: RTASettings;
}

interface SendTorrentError {
    httpResponseCode?: unknown;
    httpResponseBody?: unknown;
}

export async function dispatchPreAddTorrent(
    message: IPreAddTorrentMessage,
    windowId: number,
    context: TorrentDownloadContext = {},
): Promise<void> {
    const request: AddTorrentByUrlRequest = { webUiId: message.webUiId ?? "", url: message.url, config: null };
    const allWebUis = await getAllWebUis(new Settings());
    const webUi = findWebUiById(request.webUiId, allWebUis) ?? allWebUis[0];
    if (!webUi) {
        void notifyNoWebUiConfigured(request);
    } else if (webUi.settings.showPerTorrentConfigSelector) {
        await addTorrentViaChooser({ webUi, url: message.url, windowId, context });
    } else {
        void downloadAndAddTorrentToWebUi(webUi, request, context);
    }
}

export async function addTorrentToWebUiById(request: AddTorrentByUrlRequest, context: TorrentDownloadContext = {}): Promise<void> {
    const webUi = findWebUiById(request.webUiId, await getAllWebUis(new Settings()));
    if (!webUi) {
        void notifyNoWebUiConfigured(request);
        return;
    }
    void downloadAndAddTorrentToWebUi(webUi, request, context);
}

/**
 * Completes the flow the popup started: the torrent itself is still sitting in
 * IndexedDB where `dispatchPreAddTorrent` parked it, so the popup only has to
 * say which WebUI and which label/dir the user picked.
 */
export async function addBufferedTorrent(message: IAddTorrentMessageWithLabelAndDir, settingsProvider: Settings): Promise<void> {
    const buffered = await readBufferedTorrent();
    const webUi = findWebUiById(message.webUiId, await getAllWebUis(settingsProvider));
    if (!webUi) {
        throw new Error(`No WebUI found for id ${message.webUiId}`);
    }

    sendTorrentToWebUi(webUi, buffered.torrent, message.config);
    await clearBufferedTorrent();
    await updateWebUiLabelsAndDirectories(settingsProvider, message)
        .catch(e => console.error("Failed updating labels/dirs", e));
}

async function addTorrentViaChooser(chooser: ChooserRequest): Promise<void> {
    const torrent = await downloadTorrentOrNotify(chooser.webUi, chooser.url, chooser.context);
    if (!torrent) {
        return;
    }
    await saveBufferedTorrent({ torrent, webUiSettings: chooser.webUi.settings });
    await openChooser(chooser.webUi, chooser.windowId);
}

async function downloadAndAddTorrentToWebUi(
    webUi: TorrentWebUI,
    request: AddTorrentByUrlRequest,
    context: TorrentDownloadContext,
): Promise<void> {
    const torrent = await downloadTorrentOrNotify(webUi, request.url, context);
    if (!torrent) {
        return;
    }
    sendTorrentToWebUi(webUi, torrent, request.config ?? createFallbackUploadConfig(webUi, torrent));
}

async function downloadTorrentOrNotify(
    webUi: TorrentWebUI,
    url: string,
    context: TorrentDownloadContext,
): Promise<Torrent | undefined> {
    try {
        return await downloadTorrent(url, context);
    } catch (error) {
        console.error("Error downloading torrent:", error);
        notifyDownloadFailure(error, await new Settings().loadSettings(), webUiUrlOf(webUi));
        return undefined;
    }
}

async function openChooser(webUi: TorrentWebUI, windowId: number): Promise<void> {
    if (webUi.settings.useAlternativeLabelDirChooser) {
        openPopupWindow();
        return;
    }
    await ext.windows.update(windowId, { focused: true });
    try {
        await openActionPopup(windowId);
    } catch (error) {
        console.warn("Could not open the action popup; falling back to a window.", error);
        openPopupWindow();
    }
}

async function getAllWebUis(settingsProvider: Settings): Promise<TorrentWebUI[]> {
    return initiateWebUis(await settingsProvider.loadSettings());
}

function findWebUiById(webUiId: string, allWebUis: TorrentWebUI[]): TorrentWebUI | undefined {
    return webUiId ? allWebUis.find(webUi => webUi.settings.id === webUiId) : undefined;
}

function createFallbackUploadConfig(webUi: TorrentWebUI, torrent: Torrent): TorrentUploadConfig {
    const autoLabelDirSettings = webUi.settings.autoLabelDirSettings;
    return {
        addPaused: webUi.settings.addPaused,
        dir: getAutoDirResult(torrent, autoLabelDirSettings) ?? webUi.settings.defaultDir ?? undefined,
        label: getAutoLabelResult(torrent, autoLabelDirSettings) ?? webUi.settings.defaultLabel ?? undefined
    };
}

function sendTorrentToWebUi(webUi: TorrentWebUI, torrent: Torrent, config: TorrentUploadConfig | null): void {
    deliverTorrent(webUi, torrent, config ?? {})
        .catch(error => console.error(`Failed sending ${torrent.name} to ${webUi.name}:`, error));
}

async function deliverTorrent(webUi: TorrentWebUI, torrent: Torrent, config: TorrentUploadConfig): Promise<void> {
    const delivery: Delivery = { webUi, torrent, settings: await new Settings().loadSettings() };
    try {
        notifyAddingResult(delivery, await webUi.sendTorrent(torrent, config));
    } catch (error) {
        notifyAddingError(delivery, error);
    }
}

function notifyAddingResult(delivery: Delivery, torrentAddingResult: TorrentAddingResult): void {
    if (torrentAddingResult.success) {
        reportAddingSuccess(delivery);
    } else {
        reportAddingRefusal(delivery, torrentAddingResult);
    }
}

function reportAddingSuccess({ webUi, torrent, settings }: Delivery): void {
    console.log(`Torrent sent successfully: ${torrent.name} to -> ${webUi.name}`);
    if (!settings.notificationsEnabled) {
        return;
    }
    notifyWithUserSettings(settings, {
        title: "Torrent added successfully",
        message: `${torrent.name} successfully added to ${webUi.name}`,
        isFailed: false,
        webUiUrl: webUiUrlOf(webUi),
    });
}

function reportAddingRefusal(delivery: Delivery, torrentAddingResult: TorrentAddingResult): void {
    const { httpResponseCode, httpResponseBody } = torrentAddingResult;
    const refusal = `HTTP Response code: ${httpResponseCode}\nResponse body: ${httpResponseBody}`;
    console.error(`${delivery.webUi.name} refused ${delivery.torrent.name}:`, refusal);
    if (!delivery.settings.notificationsEnabled) {
        return;
    }
    notifyAddingFailure(delivery, refusal);
}

function notifyAddingError(delivery: Delivery, error: unknown): void {
    console.error("Error sending torrent:", error);
    notifyAddingFailure(delivery, describeSendTorrentError(error));
}

function describeSendTorrentError(error: unknown): string {
    const { httpResponseCode, httpResponseBody } = (error ?? {}) as SendTorrentError;
    if (httpResponseCode === undefined) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
    return `Error (${httpResponseCode}):\n${httpResponseBody}`;
}

function notifyAddingFailure(delivery: Delivery, message: string): void {
    notifyWithUserSettings(delivery.settings, {
        title: "Torrent adding failed",
        message,
        isFailed: true,
        webUiUrl: webUiUrlOf(delivery.webUi),
    });
}

function webUiUrlOf(webUi: TorrentWebUI): string {
    return addTrailingSlash(webUi.createBaseUrl());
}

async function notifyNoWebUiConfigured(request: AddTorrentByUrlRequest): Promise<void> {
    const settings = await new Settings().loadSettings();
    console.error(`No WebUI found for id "${request.webUiId}".`);
    notifyWithUserSettings(settings, { title: "No WebUI configured", message: "Check your settings.", isFailed: true });
}

function notifyDownloadFailure(error: unknown, settings: RTASettings, webUiUrl: string): void {
    if (error instanceof CloudflareChallengeError) {
        notifyWithUserSettings(settings, {
            title: "Cloudflare is blocking this download",
            message: error.message,
            isFailed: true,
            webUiUrl: error.challengeUrl,
        });
        return;
    }

    notifyWithUserSettings(settings, { title: "Error downloading torrent", message: `Error: ${error}`, isFailed: true, webUiUrl });
}

function notifyWithUserSettings(settings: RTASettings, notification: NotificationRequest): void {
    showNotification({
        ...notification,
        popupDurationMs: settings.notificationsDurationMs,
        playSound: settings.notificationsSoundEnabled,
    });
}

async function updateWebUiLabelsAndDirectories(settingsProvider: Settings, message: IAddTorrentMessageWithLabelAndDir): Promise<void> {
    const { webUiId, labels, directories } = message;
    const settings = await settingsProvider.loadSettings();
    const webUiSettings = settings.webuiSettings.find(candidate => candidate.id === webUiId);
    if (!webUiSettings) {
        throw new Error(`WebUI with id ${webUiId} not found in settings; couldn't update labels and directories.`);
    }
    webUiSettings.labels = labels;
    webUiSettings.dirs = directories;
    await settingsProvider.saveSettings(settings);
}
