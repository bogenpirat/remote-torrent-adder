import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class BiglyBTWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createBiglyBTBaseUrl(torrent, config);

            await this.fetchSessionCookie(url);

            const payload = torrent.isMagnet
                ? this.createPayloadForMagnet(torrent.data as string, config)
                : this.createPayloadForTorrent(torrent);

            const response = await this.fetch(url, { method: 'POST', body: payload });
            const responseBody = await response.text();
            return {
                success: this.isSuccessResponse(responseBody),
                httpResponseCode: response.status,
                httpResponseBody: responseBody,
            };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    createBiglyBTBaseUrl(torrent: Torrent, config: TorrentUploadConfig): string {
        return [
            this.createBaseUrl(),
            "/transmission/",
            torrent.isMagnet ? "rpc" : "upload", 
            !torrent.isMagnet && this.getAddPaused(config) ? "?paused=true" : "",
        ].join("");
    }

    fetchSessionCookie(apiBaseUrl: string): Promise<Response> {
        return new Promise((resolve, reject) => {
            fetch(apiBaseUrl)
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
        return JSON.stringify({ "method": "torrent-add", "arguments": { "paused": `${this.getAddPaused(config)}`, "filename": magnetUri } });
    }

    createPayloadForTorrent(torrent: Torrent): FormData {
        const payload = new FormData();

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
        payload.append("torrent_files[]", blobData, torrent.name);

        return payload;
    }

    private isSuccessResponse(responseBody: string): boolean {
        if (/<h1>200: OK<\/h1>/.test(responseBody)) {
            return true;
        }
        try {
            return JSON.parse(responseBody)["result"] === "success";
        } catch {
            return false;
        }
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
