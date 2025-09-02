import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class TTorrentWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise(async (resolve, reject) => {
            let payload: FormData;
            let url = this.createTTorrentBaseUrl();
            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent);
                url += "/downloadFromUrl";
            } else {
                payload = await this.createPayloadForTorrent(torrent);
                url += "/downloadTorrent";
            }

            this.sendRequest(url, payload, resolve, reject);
        });
    }

    private createTTorrentBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/cmd"
        ].join("");
    }

    private async createPayloadForTorrent(torrent: Torrent): Promise<FormData> {
        return new Promise(async (resolve, reject) => {
            const payload = new FormData();
            payload.append("torrentfile", torrent.data as Blob, torrent.name);
            resolve(payload);
        });
    }

    private createPayloadForMagnet(torrent: Torrent): FormData {
        const payload = new FormData();
        payload.append("url", torrent.data as string);
        return payload;
    }

    private sendRequest(url: string, payload: FormData, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, {
            method: 'POST',
            body: payload
        }).then(async (response) => {
            if (response.status === 200) {
                resolve({ success: true, httpResponseCode: response.status, httpResponseBody: await response.text() });
            } else {
                reject({ success: false, httpResponseCode: response.status, httpResponseBody: await response.text() });
            }
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
