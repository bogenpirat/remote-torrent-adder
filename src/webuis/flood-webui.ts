import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class FloodWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const url = this.createBaseUrl() + (torrent.isMagnet ? "/api/torrents/add-urls" : "/api/torrents/add-files");

            this.authenticate()
                .then(() => this.createTorrentFetchOptions(torrent, config))
                .then(fetchOpts => {
                    this.sendRequest(url, fetchOpts, resolve, reject);
                });
        });
    }

    private authenticate(): Promise<void> {
        return new Promise((resolve, reject) => {
            const authenticationUrl = this.createBaseUrl() + "/api/auth/authenticate";
            this.fetch(authenticationUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                body: JSON.stringify({
                    username: this._settings.username,
                    password: this._settings.password
                })
            }).then(response =>
                response.json()
            ).then((json) => {
                if (json.success) {
                    resolve();
                } else {
                    reject(new Error("Authentication failed"));
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private createTorrentFetchOptions(torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        return new Promise(async (resolve, reject) => {
            let fetchOpts: RequestInit = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                }
            };

            if (torrent.isMagnet) {
                fetchOpts["body"] = JSON.stringify(this.createPayloadForMagnet(torrent.data as string, config));
            } else {
                fetchOpts["body"] = JSON.stringify(await this.createPayloadForTorrent(torrent, config));
            }

            resolve(fetchOpts);
        });
    }

    private createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): Record<string, any> {
        const tags = this.getLabel(config) ? [this.getLabel(config)] : [];
        return {
            urls: [magnetUri],
            start: !this.getAddPaused(config),
            destination: this.getDirectory(config) ?? "",
            tags,
            isBasePath: false,
            isCompleted: false
        };
    }

    private async createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, any>> {
        const tags = this.getLabel(config) ? [this.getLabel(config)] : [];
        return {
            files: [await blobToBase64(torrent.data as Blob)],
            start: !this.getAddPaused(config),
            destination: this.getDirectory(config) ?? "",
            tags,
            isBasePath: false,
            isCompleted: false
        };
    }

    private sendRequest(url: string, fetchOpts: RequestInit, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, fetchOpts).then(async (response) => {
            if (response.status === 200 || response.status === 202) {
                resolve({ success: true, httpResponseCode: response.status, httpResponseBody: null });
            } else {
                reject({ success: false, httpResponseCode: response.status, httpResponseBody: await response.text() });
            }
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
