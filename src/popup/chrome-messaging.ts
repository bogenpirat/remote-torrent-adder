import { WebUIFactory } from "../models/clients";
import { GetPreAddedTorrentAndSettings, GetPreAddedTorrentAndSettingsResponse, IAddTorrentMessageWithLabelAndDir, AddTorrentMessageWithLabelAndDir, IGetPreAddedTorrentAndSettingsResponse } from "../models/messages";
import { convertSerializedToTorrent, convertTorrentToSerialized } from "../util/serializer";
import { FormControl } from "./app/page";
import { SerializedTorrent, Torrent, TorrentUploadConfig } from "../models/torrent";


export function getTorrentAndSettingsAndFillPopup(popupControl: FormControl): void {
    chrome.runtime.sendMessage({ action: GetPreAddedTorrentAndSettings.action }, (response: IGetPreAddedTorrentAndSettingsResponse) => {
        if (response && response.action === GetPreAddedTorrentAndSettingsResponse.action) {
            const torrent = convertSerializedToTorrent(response.serializedTorrent);
            console.log("received event:", response, torrent);
            setPopupStateForMessage(response, popupControl, torrent);
        }
    });
}

function setPopupStateForMessage(message: IGetPreAddedTorrentAndSettingsResponse, popupControl: FormControl, torrent: Torrent): void {
    const webUi = WebUIFactory.createWebUI(message.webUiSettings);

    popupControl.torrent(torrent);

    popupControl.label(message.autoLabelDirResult?.label || message.webUiSettings.defaultLabel || getFirstEntry(message.webUiSettings.labels) || "");
    popupControl.labelOptions(message.webUiSettings.labels);

    popupControl.directory(message.autoLabelDirResult?.directory || message.webUiSettings.defaultDir || getFirstEntry(message.webUiSettings.dirs) || "");
    popupControl.directoryOptions(message.webUiSettings.dirs);

    popupControl.autoDir(!!message.autoLabelDirResult?.directory);
    popupControl.autoLabeled(!!message.autoLabelDirResult?.label);

    popupControl.paused(message.webUiSettings.addPaused);

    popupControl.visibility.directory(webUi.isDirSupported);
    popupControl.visibility.label(webUi.isLabelSupported);
    popupControl.visibility.paused(webUi.isAddPausedSupported);

    popupControl.webUiSettings(message.webUiSettings);
    // initialize client-specific settings for this web UI in the popup
    popupControl.clientSpecificSettings({ ...(message.webUiSettings.clientSpecificSettings || {}) });

    popupControl.addTorrentCb(sendAddTorrentAndLabelDirSettingsMessage);
}

function sendAddTorrentAndLabelDirSettingsMessage(webUiId: string, torrent: Torrent, label: string, dir: string, paused: boolean, labelOptions: string[], directoryOptions: string[], clientSpecificSettings: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
        convertTorrentToSerialized(torrent).then((serializedTorrent: SerializedTorrent) => {
            chrome.runtime.sendMessage({
                action: AddTorrentMessageWithLabelAndDir.action,
                webUiId,
                serializedTorrent: serializedTorrent,
                config: {
                    label,
                    dir,
                    addPaused: paused,
                    clientSpecificSettings: clientSpecificSettings || {}
                } as TorrentUploadConfig,
                labels: labelOptions,
                directories: directoryOptions
            } as IAddTorrentMessageWithLabelAndDir).then((response: any) => {
                resolve();
            });
        })
    });
}

function getFirstEntry(collection: Array<string>): string | null {
    return collection && collection.length > 0 ? collection[0] : null;
}