import { WebUIFactory } from "../models/clients";
import { AddTorrentMessageWithLabelAndDir, type IAddTorrentMessageWithLabelAndDir } from "../models/messages";
import { type TorrentUploadConfig } from "../models/torrent";
import { getAutoDirResult, getAutoLabelResult } from "../util/auto-label-dir-matcher";
import { type BufferedTorrent, readBufferedTorrent } from "../util/buffered-torrent";
import { type FormControl } from "./app/page";

export function getTorrentAndSettingsAndFillPopup(popupControl: FormControl): void {
    readBufferedTorrent()
        .then(buffered => {
            if (!buffered) {
                console.warn("Popup opened with no buffered torrent to add.");
                return;
            }
            fillPopup(buffered, popupControl);
        })
        .catch(error => console.error("Failed reading the buffered torrent", error));
}

function fillPopup(buffered: BufferedTorrent, popupControl: FormControl): void {
    const { torrent, webUiSettings } = buffered;
    const webUi = WebUIFactory.createWebUI(webUiSettings);

    // The matcher is pure, so the popup resolves the automatic label/dir itself
    // rather than having the service worker compute and ship it.
    const autoLabel = getAutoLabelResult(torrent, webUiSettings.autoLabelDirSettings);
    const autoDir = getAutoDirResult(torrent, webUiSettings.autoLabelDirSettings);

    popupControl.torrent(torrent);

    popupControl.label(autoLabel || webUiSettings.defaultLabel || getFirstEntry(webUiSettings.labels) || "");
    popupControl.labelOptions(webUiSettings.labels);

    popupControl.directory(autoDir || webUiSettings.defaultDir || getFirstEntry(webUiSettings.dirs) || "");
    popupControl.directoryOptions(webUiSettings.dirs);

    popupControl.autoDir(!!autoDir);
    popupControl.autoLabeled(!!autoLabel);

    popupControl.paused(webUiSettings.addPaused);

    popupControl.visibility.directory(webUi?.isDirSupported ?? false);
    popupControl.visibility.label(webUi?.isLabelSupported ?? false);
    popupControl.visibility.paused(webUi?.isAddPausedSupported ?? false);

    popupControl.webUiSettings(webUiSettings);

    popupControl.addTorrentCb(sendAddTorrentAndLabelDirSettingsMessage);
}

/**
 * The torrent bytes stay in IndexedDB; this only tells the service worker which
 * WebUI and which label/dir the user settled on.
 */
async function sendAddTorrentAndLabelDirSettingsMessage(
    webUiId: string,
    label: string,
    dir: string,
    paused: boolean,
    labelOptions: string[],
    directoryOptions: string[],
): Promise<void> {
    await chrome.runtime.sendMessage({
        action: AddTorrentMessageWithLabelAndDir.action,
        webUiId,
        config: {
            label,
            dir,
            addPaused: paused,
        } as TorrentUploadConfig,
        labels: labelOptions,
        directories: directoryOptions
    } as IAddTorrentMessageWithLabelAndDir);
}

function getFirstEntry(collection: Array<string>): string | null {
    return collection?.[0] ?? null;
}
