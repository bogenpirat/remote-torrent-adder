import { GetPreAddedTorrentAndSettings, GetPreAddedTorrentAndSettingsResponse } from "../models/messages";
import { convertSerializedToTorrent } from "../util/serializer";

chrome.runtime.sendMessage({ action: GetPreAddedTorrentAndSettings.action }, (response) => {
    if (response && response.action === GetPreAddedTorrentAndSettingsResponse.action) {
        const torrent = convertSerializedToTorrent(response.serializedTorrent);
        console.log("received event:", response, torrent);
    }
});

function closePopup(): void {
    window.close();
}