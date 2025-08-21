import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class ElementumWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise(async (resolve, reject) => {
            const url = this.createElementumBaseUrl(torrent);
            let payload: FormData;

            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent.data as string, config);
            } else {
                payload = this.createPayloadForTorrent(torrent);
            }

            this.sendRequest(url, payload, resolve, reject);
        });
    }

    createElementumBaseUrl(torrent: Torrent): string {
        return [
            this.createBaseUrl(),
            "/playuri"
        ].join("");
    }

    createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): FormData {
        const payload = new FormData();

        payload.append("uri", magnetUri);

        return payload;
    }

    createPayloadForTorrent(torrent: Torrent): FormData {
        const payload = new FormData();

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
        payload.append("file", blobData, torrent.name);

        return payload;
    }

    sendRequest(url: string, payload: FormData, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, {
            method: 'POST',
            body: payload
        }).then(async (response) => {
            const responseBody = await response.text();
            if (response.status === 200) {
                resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseBody });
                return;
            }
            reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseBody });
        }).catch(error => {
            reject({ success: false, httpResponseCode: 0, httpResponseBody: error.message || null });
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
