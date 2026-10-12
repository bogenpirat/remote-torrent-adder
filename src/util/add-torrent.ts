import { ext } from "./browser-api";
import { type IAddTorrentMessageWithLabelAndDir, type IPreAddTorrentMessage } from "../models/messages";
import { type RTASettings } from "../models/settings";
import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult, type TorrentWebUI } from "../models/webui";
import { HttpError } from "../models/webui-http";
import { openActionPopup, openPopupWindow } from "./action";
import { getAutoDirResult, getAutoLabelResult } from "./auto-label-dir-matcher";
import { clearBufferedTorrent, readBufferedTorrent, saveBufferedTorrent } from "./buffered-torrent";
import { CloudflareChallengeError, downloadTorrent, type TorrentDownloadContext } from "./download";
import { type NotificationRequest, showNotification } from "./notifications";
import { type Settings } from "./settings";
import { addTrailingSlash } from "./utils";
import { initiateWebUis } from "./webuis";

export interface AddTorrentByUrlRequest {
    webUiId: string;
    url: string;
    config: TorrentUploadConfig | null;
}

export interface PreAddTorrentRequest {
    message: IPreAddTorrentMessage;
    windowId: number;
    context: TorrentDownloadContext;
}

interface Destination {
    webUi: TorrentWebUI;
    settings: RTASettings;
}

interface Delivery extends Destination {
    torrent: Torrent;
}

export async function dispatchPreAddTorrent(preAddRequest: PreAddTorrentRequest, settings: RTASettings): Promise<void> {
    const { message, context } = preAddRequest;
    const request: AddTorrentByUrlRequest = { webUiId: message.webUiId ?? "", url: message.url, config: null };
    const allWebUis = await initiateWebUis(settings);
    const webUi = findWebUiById(request.webUiId, allWebUis) ?? allWebUis[0];
    if (!webUi) {
        reportNoWebUiConfigured(request, settings);
    } else if (webUi.settings.showPerTorrentConfigSelector) {
        await addTorrentViaChooser({ webUi, settings }, preAddRequest);
    } else {
        addTorrentInBackground({ webUi, settings }, request, context);
    }
}

export async function addTorrentToWebUiById(
    request: AddTorrentByUrlRequest,
    context: TorrentDownloadContext,
    settings: RTASettings,
): Promise<void> {
    const webUi = findWebUiById(request.webUiId, await initiateWebUis(settings));
    if (!webUi) {
        reportNoWebUiConfigured(request, settings);
        return;
    }
    addTorrentInBackground({ webUi, settings }, request, context);
}

/**
 * Completes the flow the popup started: the torrent itself is still sitting in
 * IndexedDB where `dispatchPreAddTorrent` parked it, so the popup only has to
 * say which WebUI and which label/dir the user picked.
 */
export async function addBufferedTorrent(message: IAddTorrentMessageWithLabelAndDir, settingsProvider: Settings): Promise<void> {
    const { torrent } = await readBufferedTorrent();
    const settings = await settingsProvider.loadSettings();
    const webUi = findWebUiById(message.webUiId, await initiateWebUis(settings));
    if (!webUi) {
        throw new Error(`No WebUI found for id ${message.webUiId}`);
    }

    sendTorrentToWebUi({ webUi, settings, torrent }, message.config);
    await clearBufferedTorrent();
    await updateWebUiLabelsAndDirectories(settingsProvider, message)
        .catch(e => console.error("Failed updating labels/dirs", e));
}

async function addTorrentViaChooser(destination: Destination, preAddRequest: PreAddTorrentRequest): Promise<void> {
    const { webUi } = destination;
    const torrent = await downloadTorrentOrNotify(destination, preAddRequest.message.url, preAddRequest.context);
    if (!torrent) {
        return;
    }
    await saveBufferedTorrent({ torrent, webUiSettings: webUi.settings });
    await openChooser(webUi, preAddRequest.windowId);
}

function addTorrentInBackground(destination: Destination, request: AddTorrentByUrlRequest, context: TorrentDownloadContext): void {
    downloadAndAddTorrentToWebUi(destination, request, context)
        .catch(error => console.error(`Failed adding a torrent to ${destination.webUi.name}:`, error));
}

async function downloadAndAddTorrentToWebUi(
    destination: Destination,
    request: AddTorrentByUrlRequest,
    context: TorrentDownloadContext,
): Promise<void> {
    const torrent = await downloadTorrentOrNotify(destination, request.url, context);
    if (!torrent) {
        return;
    }
    sendTorrentToWebUi({ ...destination, torrent }, request.config ?? createFallbackUploadConfig(destination.webUi, torrent));
}

async function downloadTorrentOrNotify(
    destination: Destination,
    url: string,
    context: TorrentDownloadContext,
): Promise<Torrent | undefined> {
    try {
        return await downloadTorrent(url, context);
    } catch (error) {
        console.error("Error downloading torrent:", error);
        notifyDownloadFailure(error, destination);
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

function sendTorrentToWebUi(delivery: Delivery, config: TorrentUploadConfig | null): void {
    deliverTorrent(delivery, config ?? {})
        .catch(error => console.error(`Failed sending ${delivery.torrent.name} to ${delivery.webUi.name}:`, error));
}

async function deliverTorrent(delivery: Delivery, config: TorrentUploadConfig): Promise<void> {
    try {
        reportAddingResult(delivery, await delivery.webUi.sendTorrent(delivery.torrent, config));
    } catch (error) {
        reportAddingError(delivery, error);
    }
}

function reportAddingResult(delivery: Delivery, torrentAddingResult: TorrentAddingResult): void {
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

function reportAddingError(delivery: Delivery, error: unknown): void {
    console.error("Error sending torrent:", error);
    notifyAddingFailure(delivery, describeSendTorrentError(error));
}

function describeSendTorrentError(error: unknown): string {
    if (error instanceof HttpError) {
        return `Error (${error.status}):\n${error.body}`;
    }
    return `Error: ${messageOf(error)}`;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
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

function reportNoWebUiConfigured(request: AddTorrentByUrlRequest, settings: RTASettings): void {
    console.error(`No WebUI found for id "${request.webUiId}".`);
    notifyWithUserSettings(settings, { title: "No WebUI configured", message: "Check your settings.", isFailed: true });
}

function notifyDownloadFailure(error: unknown, { webUi, settings }: Destination): void {
    if (error instanceof CloudflareChallengeError) {
        notifyWithUserSettings(settings, {
            title: "Cloudflare is blocking this download",
            message: error.message,
            isFailed: true,
            webUiUrl: error.challengeUrl,
        });
        return;
    }

    notifyWithUserSettings(settings, {
        title: "Error downloading torrent",
        message: `Error: ${messageOf(error)}`,
        isFailed: true,
        webUiUrl: webUiUrlOf(webUi),
    });
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
