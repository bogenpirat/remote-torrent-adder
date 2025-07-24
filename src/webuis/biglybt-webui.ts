import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class BiglyBTWebUI extends TorrentWebUI {
    protected override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise(async (resolve, reject) => {
            const url = this.createBiglyBTBaseUrl(torrent);
            let payload: string | FormData;

            await this.fetchSessionCookie(url);

            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent.data as string, config);
            } else {
                payload = this.createPayloadForTorrent(torrent);
            }

            this.sendRequest(url, payload, resolve, reject);
        });
    }

    createBiglyBTBaseUrl(torrent: Torrent): string {
        return [
            this.createBaseUrl(),
            "/transmission/",
            torrent.isMagnet ? "rpc" : "upload",
            this.settings.addPaused ? "" : "?paused=false",
        ].join("");
    }

    fetchSessionCookie(apiBaseUrl: string): Promise<Response> {
        return new Promise((resolve, reject) => {
            this.fetch(apiBaseUrl)
                .then(response => {
                    if (response.status != 200 && response.status != 409) {
                        reject(response);
                    } else {
                        resolve(response);
                    }
                }).catch(error => {
                    reject(error);
                });
        });
    }

    createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): string {
        return JSON.stringify({ "method": "torrent-add", "arguments": { "paused": `${this.getPaused(config)}`, "filename": magnetUri } });
    }

    createPayloadForTorrent(torrent: Torrent): FormData {
        const payload = new FormData();

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
        payload.append("torrent_files[]", blobData, torrent.name);

        return payload;
    }

    sendRequest(url: string, payload: string | FormData, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, {
            method: 'POST',
            body: payload
        }).then(async (response) => {
            const responseBody = await response.text();
            if (/.*<h1>200: OK<\/h1>.*/.exec(responseBody) || JSON.parse(responseBody)["result"] == "success") {
                resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseBody });
                return;
            }
            reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseBody });
        }).catch(error => {
            reject({ success: false, httpResponseCode: 0, httpResponseBody: error.message || null });
        });
    }
}
