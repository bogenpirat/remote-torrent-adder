import { ext } from "../util/browser-api";
import { WebUIFactory } from "../models/clients";
import { AddTorrentMessageWithLabelAndDir, type IAddTorrentMessageWithLabelAndDir } from "../models/messages";
import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ClientSpecificSettingDescriptor, type TorrentWebUI, type WebUISettings } from "../models/webui";
import { getAutoDirResult, getAutoLabelResult } from "../util/auto-label-dir-matcher";
import { type BufferedTorrent, findBufferedTorrent } from "../util/buffered-torrent";

/**
 * Everything the popup needs, resolved once before the form is rendered, so the
 * form can initialise its fields directly instead of being filled in field by
 * field after mounting.
 */
export interface PopupData {
    torrent: Torrent;
    webUiSettings: WebUISettings;
    /** Which controls this client understands. */
    supports: {
        label: boolean;
        directory: boolean;
        paused: boolean;
    };
    /** What each control starts out as. */
    initial: {
        label: string;
        directory: string;
        paused: boolean;
    };
    /** Whether the initial value came from an auto-label/dir rule, which the UI highlights. */
    auto: {
        label: boolean;
        directory: boolean;
    };
    labelOptions: string[];
    directoryOptions: string[];
    /** Extra options the selected client understands and offers per torrent. */
    clientSpecific: {
        descriptors: ReadonlyArray<ClientSpecificSettingDescriptor>;
        initial: Record<string, boolean>;
    };
}

/** Resolves the pending torrent, or nothing when none is waiting to be added. */
export async function loadPopupData(): Promise<PopupData | undefined> {
    const buffered = await findBufferedTorrent();
    return buffered && createPopupData(buffered);
}

function createPopupData({ torrent, webUiSettings }: BufferedTorrent): PopupData {
    const webUi = WebUIFactory.supports(webUiSettings.client) ? WebUIFactory.createWebUI(webUiSettings) : undefined;
    // The matcher is pure, so the popup resolves this itself rather than having
    // the service worker compute it and ship the result across a message.
    const autoLabel = getAutoLabelResult(torrent, webUiSettings.autoLabelDirSettings);
    const autoDir = getAutoDirResult(torrent, webUiSettings.autoLabelDirSettings);

    return {
        torrent,
        webUiSettings,
        supports: describeSupport(webUi),
        initial: {
            label: resolveInitialChoice(autoLabel, webUiSettings.defaultLabel, webUiSettings.labels),
            directory: resolveInitialChoice(autoDir, webUiSettings.defaultDir, webUiSettings.dirs),
            paused: webUiSettings.addPaused,
        },
        auto: { label: !!autoLabel, directory: !!autoDir },
        labelOptions: webUiSettings.labels,
        directoryOptions: webUiSettings.dirs,
        clientSpecific: describeClientSpecific(webUi, webUiSettings),
    };
}

function resolveInitialChoice(autoResult: string | undefined, defaultChoice: string | null, options: string[]): string {
    return autoResult || defaultChoice || firstEntry(options) || "";
}

function firstEntry(collection: Array<string>): string | undefined {
    return collection?.[0];
}

function describeSupport(webUi: TorrentWebUI | undefined): PopupData["supports"] {
    return {
        label: webUi?.isLabelSupported ?? false,
        directory: webUi?.isDirSupported ?? false,
        paused: webUi?.isAddPausedSupported ?? false,
    };
}

function describeClientSpecific(webUi: TorrentWebUI | undefined, webUiSettings: WebUISettings): PopupData["clientSpecific"] {
    const descriptors = (webUi?.clientSpecificSettingDescriptors ?? []).filter(descriptor => descriptor.perTorrent);
    return {
        descriptors,
        initial: Object.fromEntries(descriptors.map(descriptor => [
            descriptor.key,
            (webUiSettings.clientSpecificSettings?.[descriptor.key] as boolean | undefined) ?? descriptor.default,
        ])),
    };
}

export interface AddTorrentRequest {
    webUiId: string;
    label: string;
    directory: string;
    paused: boolean;
    labelOptions: string[];
    directoryOptions: string[];
    clientSpecific: Record<string, boolean>;
}

/**
 * The torrent bytes stay in IndexedDB; this only reports which WebUI and which
 * label/dir the user settled on. Rejects if the service worker reports a
 * problem, so the popup can surface it instead of closing on a failure.
 */
export async function submitTorrent(request: AddTorrentRequest): Promise<void> {
    const message: IAddTorrentMessageWithLabelAndDir = {
        action: AddTorrentMessageWithLabelAndDir.action,
        webUiId: request.webUiId,
        config: {
            label: request.label,
            dir: request.directory,
            addPaused: request.paused,
            clientSpecificSettings: request.clientSpecific,
        } satisfies TorrentUploadConfig,
        labels: request.labelOptions,
        directories: request.directoryOptions,
    };

    const response = await ext.runtime.sendMessage(message);
    if (response && typeof response === "object" && "error" in response) {
        throw new Error(String(response.error));
    }
}
