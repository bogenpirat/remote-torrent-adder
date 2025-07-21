import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class RuTorrentWebUI extends TorrentWebUI {
    protected override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const url = this.createRutorrentBaseUrl(config);
            let payload: string | FormData;
            let headers: Record<string, string>;

            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent.data as string);
                headers = { "Content-Type": "application/x-www-form-urlencoded" };
            } else {
                payload = this.createPayloadForTorrent(torrent, config);
                headers = { "Content-Type": "multipart/form-data" };
            }

            this.sendRequest(url, payload, headers, resolve, reject);
        });
    }

    createRutorrentBaseUrl(config: TorrentUploadConfig): string {
        return [
            this.createBaseUrl(),
            "php/addtorrent.php?",
            config.dir ? `dir_edit=${encodeURIComponent(config.dir)}&` : "",
            config.label ? `label=${encodeURIComponent(config.label)}&` : "",
            this._settings.addPaused ? "torrents_start_stopped=1&" : "",
            this._settings.clientSpecificSettings["dontAddNamePath"] ? "not_add_path=1&" : "",
        ].join("");
    }

    createPayloadForMagnet(magnetUri: string): string {
        return `url=${encodeURIComponent(magnetUri)}`;
    }

    createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): FormData {
        const message = new FormData();

        if (config.dir) {
            message.append("dir_edit", config.dir);
        }

        if (config.label) {
            message.append("label", config.label);
        }

        const blobData = new Blob([torrent.data as Uint8Array], { type: "application/x-bittorrent" });
        const filename = torrent.name;
        message.append("torrent_file", blobData, filename);

        return message;
    }

    sendRequest(url: string, payload: string | FormData, headers: Record<string, string>, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, {
            method: 'POST',
            headers: headers,
            body: payload
        }).then(async (response) => {
            const responseBody = await response.text();
            if (/.*result\[\]=Success.*/.exec(response.url) || /.*addTorrentSuccess.*/.exec(responseBody)) {
                resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseBody });
                return;
            }
            reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseBody });
        }).catch(error => {
            reject({ success: false, httpResponseCode: 0, httpResponseBody: error.message || null });
        });
    }
}
