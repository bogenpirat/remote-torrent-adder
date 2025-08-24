import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class TransmissionWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const url = this.createBaseUrl() + "/transmission/rpc";

            this.fetchTransmissionSessionId()
                .then((transmissionSessionId) => this.createTorrentFetchOptions(torrent, config, transmissionSessionId))
                .then(fetchOpts => this.sendRequest(url, fetchOpts, resolve, reject));
        });
    }

    private fetchTransmissionSessionId(): Promise<string> {
        return new Promise((resolve, reject) => {
            const rpcUrl = this.createBaseUrl() + "/transmission/rpc";
            fetch(rpcUrl, {
                method: "POST",
                body: ""
            }).then(response => {
                if (response.status == 200 || response.status == 409) {
                    const sessionId = response.headers.get("X-Transmission-Session-Id");
                    resolve(sessionId);
                } else {
                    reject(new Error("Authentication failed"));
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private createTorrentFetchOptions(torrent: Torrent, config: TorrentUploadConfig, transmissionSessionId: string): Promise<RequestInit> {
        return new Promise(async (resolve, reject) => {
            let fetchOpts: RequestInit = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Transmission-Session-Id": transmissionSessionId
                }
            };

            const payload: Record<string, string | Record<string, string>> = {
                method: "torrent-add",
                arguments: {}
            };
            if (torrent.isMagnet) {
                payload["arguments"] = {
                    filename: torrent.data as string
                };
            } else {
                payload["arguments"] = {
                    metainfo: await blobToBase64(torrent.data as Blob)
                };
            }

            if (this.getDirectory(config)) {
                payload["arguments"]["download-dir"] = this.getDirectory(config);
            }

            if (this.getAddPaused(config) !== null) {
                payload["arguments"]["paused"] = this.getAddPaused(config).toString();
            }

            fetchOpts["body"] = JSON.stringify(payload);
            resolve(fetchOpts);
        });
    }

    private sendRequest(url: string, fetchOpts: RequestInit, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, fetchOpts)
            .then(async (response) => {
                const responseText = await response.text();
                const responseData = JSON.parse(responseText);
                if (responseData["result"] === "success") {
                    resolve({ success: true, httpResponseCode: response.status, httpResponseBody: JSON.stringify(responseData) });
                } else {
                    reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseText });
                }
            }).catch(error => {
                reject({ success: false, httpResponseCode: 0, httpResponseBody: error.message || null });
            });
    }

    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return true;
    }

    get isAddPausedSupported(): boolean {
        return true;
    }
}
