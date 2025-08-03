import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class RuTorrentWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const url = this.createRutorrentBaseUrl(config);
            let payload: string | FormData;
            let headers: Record<string, string>;

            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent.data as string);
                headers = { "Content-Type": "application/x-www-form-urlencoded" };
            } else {
                payload = this.createPayloadForTorrent(torrent, config);
            }

            this.sendRequest(url, payload, headers, resolve, reject);
        });
    }

    createRutorrentBaseUrl(config: TorrentUploadConfig): string {
        const targetDir = this.getDirectory(config);
        const targetLabel = this.getLabel(config);
        const addPaused = this.getAddPaused(config);
        return [
            this.createBaseUrl(),
            "php/addtorrent.php?",
            targetDir ? `dir_edit=${encodeURIComponent(targetDir)}&` : "",
            targetLabel ? `label=${encodeURIComponent(targetLabel)}&` : "",
            addPaused ? "torrents_start_stopped=1&" : "",
            this._settings.clientSpecificSettings["dontAddNamePath"] ? "not_add_path=1&" : "", // TODO: what
        ].join("");
    }

    createPayloadForMagnet(magnetUri: string): string {
        return `url=${encodeURIComponent(magnetUri)}`;
    }

    createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): FormData {
        const message = new FormData();

        const dir = this.getDirectory(config);
        if (dir) {
            message.append("dir_edit", dir);
        }

        const label = this.getLabel(config);
        if (label) {
            message.append("label", label);
        }

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
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

    get isLabelSupported(): boolean {
        return true;
    }

    get isDirSupported(): boolean {
        return true;
    }

    get isAddPausedSupported(): boolean {
        return true;
    }
}
