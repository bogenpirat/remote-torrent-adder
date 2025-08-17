import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class QBittorrentWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const url = this.createBaseUrl() + "/api/v2/torrents/add";

            this.authenticate()
                .then(() => this.createTorrentFetchOptions(torrent, config))
                .then(fetchOpts => {
                    this.sendRequest(url, fetchOpts, resolve, reject);
                });
        });
    }

    private authenticate(): Promise<void> {
        return new Promise((resolve, reject) => {
            const authenticationUrl = this.createBaseUrl() + "/api/v2/auth/login";
            const authenticationBody = new URLSearchParams();
            authenticationBody.append("username", this._settings.username);
            authenticationBody.append("password", this._settings.password);
            this.fetch(authenticationUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
                },
                body: authenticationBody
            }).then(response => {
                if (response.status == 200) {
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
            };

            fetchOpts["body"] = new FormData();
            if (torrent.isMagnet) {
                fetchOpts["body"].append("urls", torrent.data as string);
            } else {
                fetchOpts["body"].append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
            }
            
            if(this.getDirectory(config)) {
                fetchOpts["body"].append("savepath", this.getDirectory(config));
            }
            
            if(this.getLabel(config)) {
                fetchOpts["body"].append("category", this.getLabel(config));
            }
            
            if(this.getAddPaused(config) !== null) {
                fetchOpts["body"].append("stopped", this.getAddPaused(config).toString());
            }

            resolve(fetchOpts);
        });
    }

    private sendRequest(url: string, fetchOpts: RequestInit, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, fetchOpts).then(async (response) => {
            if (response.status === 200) {
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
