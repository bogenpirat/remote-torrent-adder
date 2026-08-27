import { WebUIFactory } from "../models/clients";
import { AddTorrentMessageWithLabelAndDir, type IAddTorrentMessageWithLabelAndDir } from "../models/messages";
import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ClientSpecificSettingDescriptor, type WebUISettings } from "../models/webui";
import { getAutoDirResult, getAutoLabelResult, isAutoLabelDirEnabled } from "../util/auto-label-dir-matcher";
import { readBufferedTorrent } from "../util/buffered-torrent";

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

/** Resolves the pending torrent, or null when there is nothing waiting to be added. */
export async function loadPopupData(): Promise<PopupData | null> {
    const buffered = await readBufferedTorrent();
    if (!buffered) {
        return null;
    }

    const { torrent, webUiSettings } = buffered;
    const webUi = WebUIFactory.createWebUI(webUiSettings);

    // The matcher is pure, so the popup resolves this itself rather than having
    // the service worker compute it and ship the result across a message.
    const autoEnabled = isAutoLabelDirEnabled(webUiSettings);
    const autoLabel = autoEnabled ? getAutoLabelResult(torrent, webUiSettings.autoLabelDirSettings) : null;
    const autoDir = autoEnabled ? getAutoDirResult(torrent, webUiSettings.autoLabelDirSettings) : null;

    const clientSpecificDescriptors = (webUi?.clientSpecificSettingDescriptors ?? []).filter(descriptor => descriptor.perTorrent);

    return {
        torrent,
        webUiSettings,
        supports: {
            label: webUi?.isLabelSupported ?? false,
            directory: webUi?.isDirSupported ?? false,
            paused: webUi?.isAddPausedSupported ?? false,
        },
        initial: {
            label: autoLabel || webUiSettings.defaultLabel || firstEntry(webUiSettings.labels) || "",
            directory: autoDir || webUiSettings.defaultDir || firstEntry(webUiSettings.dirs) || "",
            paused: webUiSettings.addPaused,
        },
        auto: {
            label: !!autoLabel,
            directory: !!autoDir,
        },
        labelOptions: webUiSettings.labels,
        directoryOptions: webUiSettings.dirs,
        clientSpecific: {
            descriptors: clientSpecificDescriptors,
            initial: Object.fromEntries(clientSpecificDescriptors.map(descriptor => [
                descriptor.key,
                (webUiSettings.clientSpecificSettings?.[descriptor.key] as boolean | undefined) ?? descriptor.default,
            ])),
        },
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

    const response = await chrome.runtime.sendMessage(message);
    if (response && typeof response === "object" && "error" in response) {
        throw new Error(String(response.error));
    }
}

function firstEntry(collection: Array<string>): string | null {
    return collection?.[0] ?? null;
}
