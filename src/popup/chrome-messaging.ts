import { WebUIFactory } from "../models/clients";
import { GetPreAddedTorrentAndSettings, GetPreAddedTorrentAndSettingsResponse, IGetPreAddedTorrentAndSettingsResponse } from "../models/messages";
import { convertSerializedToTorrent } from "../util/serializer";
import { FormControl } from "./app/page";


export function getTorrentAndSettingsAndFillPopup(popupControl: FormControl): void {
    chrome.runtime.sendMessage({ action: GetPreAddedTorrentAndSettings.action }, (response: IGetPreAddedTorrentAndSettingsResponse) => {
        if (response && response.action === GetPreAddedTorrentAndSettingsResponse.action) {
            const torrent = convertSerializedToTorrent(response.serializedTorrent);
            console.log("received event:", response, torrent);
            setPopupStateForMessage(response, popupControl);
        }
    });
}

function setPopupStateForMessage(message: IGetPreAddedTorrentAndSettingsResponse, popupControl: FormControl): void {
    const webUi = WebUIFactory.createWebUI(message.webUiSettings);

    popupControl.label(message.autoLabelDirResult?.label || message.webUiSettings.defaultLabel || "");
    popupControl.labelOptions(message.webUiSettings.labels);

    popupControl.directory(message.autoLabelDirResult?.directory || message.webUiSettings.defaultDir || "");
    popupControl.directoryOptions(message.webUiSettings.dirs);

    popupControl.paused(message.webUiSettings.addPaused);

    popupControl.visibility.directory(webUi.isDirSupported);
    popupControl.visibility.label(webUi.isLabelSupported);
    popupControl.visibility.paused(webUi.isAddPausedSupported);
}