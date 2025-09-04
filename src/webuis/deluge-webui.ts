import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";


export class DelugeWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const authPromise = this.authenticate();
            let latestPromise: Promise<TorrentAddingResult>;

            if (torrent.isMagnet) {
                latestPromise = authPromise
                    .then(() => this.startUploadedTorrent(torrent.data as string, config));
            } else {
                latestPromise = authPromise
                    .then(() => this.uploadTorrentFile(torrent))
                    .then(uploadedFilePath => this.startUploadedTorrent(uploadedFilePath, config));
            }

            if (config.label) {
                latestPromise = latestPromise.then(result => this.setLabelForUploadedTorrent(result.httpResponseBody, config.label.toLowerCase()));
            }

            latestPromise
                .then(resolve)
                .catch(reject);
        });
    }

    private authenticate(): Promise<void> {
        return new Promise((resolve, reject) => {
            const jsonUrl = this.createBaseUrl() + "/json";
            const payload = {
                method: "auth.login",
                params: [this._settings.password],
                id: this.randomId()
            };
            this.fetch(jsonUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }).then(async response => {
                if (response.status == 200 && (await response.json())["result"] === true) {
                    resolve();
                } else {
                    reject(new Error("Authentication failed"));
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private uploadTorrentFile(torrent: Torrent): Promise<string> {
        return new Promise((resolve, reject) => {
            const payload = new FormData();
            payload.append("file", new Blob([torrent.data], { type: "application/x-bittorrent" }), torrent.name);
            const fetchOpts = {
                method: "POST",
                body: payload
            };
            this.fetch(this.createBaseUrl() + "/upload", fetchOpts).then(async (response) => {
                const responseJson = await response.json();
                if (response.status === 200 && responseJson["success"] === true && responseJson["files"].length > 0) {
                    resolve(responseJson["files"][0]);
                } else {
                    reject(new Error("File upload failed"));
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private startUploadedTorrent(uploadedFilePathOrMagnetLink: string, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const jsonUrl = this.createBaseUrl() + "/json";
            const payload = {
                method: "web.add_torrents",
                params: [
                    [
                        {
                            path: uploadedFilePathOrMagnetLink,
                            options: {
                                add_paused: this.getAddPaused(config),
                            }
                        }
                    ]
                ],
                id: this.randomId()
            };
            if(this.getDirectory(config)) {
                payload.params[0][0].options["download_location"] = this.getDirectory(config);
            }

            this.fetch(jsonUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }).then(async (response) => {
                const responseJson = await response.json();
                const responseText = JSON.stringify(responseJson);
                if (response.status == 200 && responseJson["result"] && responseJson["result"].length > 0 && responseJson["result"][0].length > 0 && responseJson["result"][0][0] === true) {
                    resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseText });
                } else {
                    reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseText });
                }
            }).catch(error => {
                reject({ success: false, httpResponseCode: 0, httpResponseBody: error.message || null });
            });
        });
    }

    private setLabelForUploadedTorrent(startUploadedTorrentResponseJson: string, label: string): Promise<TorrentAddingResult> {
        const startUploadedTorrentResponse = JSON.parse(startUploadedTorrentResponseJson);
        return new Promise((resolve, reject) => {
            this.fetch(this.createBaseUrl() + "/json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    method: "label.add",
                    params: [label],
                    id: this.randomId()
                })
            }).then(() => {
                return this.fetch(this.createBaseUrl() + "/json", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        method: "label.set_torrent",
                        params: [startUploadedTorrentResponse["result"][0][1], label],
                        id: this.randomId()
                    })
                });
            }).then(async response => {
                if (response.status === 200) {
                    resolve({ success: true, httpResponseCode: response.status, httpResponseBody: JSON.stringify(startUploadedTorrentResponse) });
                } else {
                    reject({ success: false, httpResponseCode: response.status, httpResponseBody: await response.text() });
                }
            }).catch(reject);
        });
    }

    private randomId(): number {
        return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER + 1));
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
