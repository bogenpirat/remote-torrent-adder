import { WebUIFactory } from "../models/clients";
import { GetPreAddedTorrentAndSettings, GetPreAddedTorrentAndSettingsResponse, IAddTorrentMessageWithLabelAndDir, AddTorrentMessageWithLabelAndDir, IGetPreAddedTorrentAndSettingsResponse } from "../models/messages";
import { convertSerializedToTorrent, convertTorrentToSerialized } from "../util/serializer";
import { FormControl, AddTorrentCallback } from "./app/page";
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

    popupControl.label(message.autoLabelDirResult?.label || message.webUiSettings.defaultLabel || "");
    popupControl.labelOptions(message.webUiSettings.labels);

    popupControl.directory(message.autoLabelDirResult?.directory || message.webUiSettings.defaultDir || "");
    popupControl.directoryOptions(message.webUiSettings.dirs);

    popupControl.paused(message.webUiSettings.addPaused);

    popupControl.visibility.directory(webUi.isDirSupported);
    popupControl.visibility.label(webUi.isLabelSupported);
    popupControl.visibility.paused(webUi.isAddPausedSupported);

    popupControl.webUiSettings(message.webUiSettings);

    popupControl.addTorrentCb(sendAddTorrentAndLabelDirSettingsMessage);
}

function sendAddTorrentAndLabelDirSettingsMessage(webUiId: string, torrent: Torrent, label: string, dir: string, paused: boolean, labelOptions: string[], directoryOptions: string[]): Promise<void> {
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
                } as TorrentUploadConfig,
                labels: labelOptions,
                directories: directoryOptions
            } as IAddTorrentMessageWithLabelAndDir).then((response: any) => {
                resolve();
            });
        })
    });
}