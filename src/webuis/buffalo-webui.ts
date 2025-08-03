import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { showNotification } from "../util/notifications";
import { convertToBinary } from "../util/converter";

// TODO: yeah no, none of this works yet, just a mockup

export class BuffaloWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "http://" + this._settings.host + ":" + this._settings.port + "/api/torrent-add?start=yes", true);
        xhr.onreadystatechange = function (data) {
            if (xhr.readyState == 4 && xhr.status == 200) {
                if (/.*apiTorrentAddFinishedOk.*/.exec(xhr.responseText)) {
                    showNotification("Success", "Torrent added successfully.");
                } else {
                    showNotification("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
                }
            } else if (xhr.readyState == 4 && xhr.status != 200) {
                showNotification("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
            }
        };

        // mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
        var boundary = "AJAX-----------------------" + (new Date).getTime();
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        var message = "--" + boundary + "\r\n";
        message += "Content-Disposition: form-data; name=\"fileEl\"; filename=\"" + ((torrent.name.length && torrent.name.length > 1) ? torrent.name : (new Date).getTime()) + "\"\r\n";
        message += "Content-Type: application/x-bittorrent\r\n\r\n";
        message += torrent.data + "\r\n";
        message += "--" + boundary + "--\r\n";

        xhr.send(convertToBinary(message));

        return Promise.resolve({ // don't work
            success: true,
            httpResponseCode: xhr.status,
            httpResponseBody: xhr.responseText
        });
    }
    
    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return false;
    }

    get isAddPausedSupported(): boolean {
        return false;
    }
}
