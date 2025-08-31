import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class TixatiWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise(async (resolve, reject) => {
            let payload: FormData;
            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent);
            } else {
                payload = await this.createPayloadForTorrent(torrent);
            }
            payload.append("noautostart", this.getAddPaused(config) === true ? "1" : "0");

            this.sendRequest(payload, resolve, reject);
        });
    }

    private createTixatiBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/transfers/action"
        ].join("");
    }

    private async createPayloadForTorrent(torrent: Torrent): Promise<FormData> {
        return new Promise(async (resolve, reject) => {
            const payload = new FormData();
            payload.append("addlinktext", "")
            const torrentPayload = new Blob([await (torrent.data as Blob).arrayBuffer()], { type: "application/octet-stream" });
            payload.append("metafile", torrentPayload, torrent.name);
            payload.append("addmetafile", "Add");

            resolve(payload);
        });
    }

    private createPayloadForMagnet(torrent: Torrent): FormData {
        const payload = new FormData();
        payload.append("addlink", "Add");
        payload.append("addlinktext", torrent.data as string);
        payload.append("metafile", new Blob(), "");

        return payload;
    }

    private sendRequest(payload: FormData, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(this.createTixatiBaseUrl(), {
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
        return true;
    }
}
