import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class PorlaWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            this.authenticateForToken()
                .then(jsonRpcToken => this.createTorrentFetchOptions(jsonRpcToken, torrent, config))
                .then(fetchOpts => {
                    this.sendRequest(this.createBaseUrl() + "/api/v1/jsonrpc", fetchOpts, resolve, reject);
                });
        });
    }

    private authenticateForToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            const authenticationUrl = this.createBaseUrl() + "/api/v1/auth/login";
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
            ).then(json => {
                if (json.error) {
                    reject(new Error(json.error));
                } else {
                    resolve(json.token);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private createTorrentFetchOptions(jsonRpcToken: string, torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        return new Promise(async (resolve, reject) => {
            let fetchOpts: RequestInit = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Authorization": "Bearer " + jsonRpcToken
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
        return {
            jsonrpc: "2.0",
            method: "torrents.add",
            id: Math.floor(Date.now() / 1000),
            params: {
                magnet_uri: magnetUri,
                preset: "",
                save_path: this.getDirectory(config) ?? "./"
            }
        };
    }

    private async createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, any>> {
        return {
            jsonrpc: "2.0",
            method: "torrents.add",
            id: Math.floor(Date.now() / 1000),
            params: {
                ti: await blobToBase64(torrent.data as Blob),
                preset: "",
                save_path: this.getDirectory(config) ?? "./"
            }
        };
    }

    private sendRequest(url: string, fetchOpts: RequestInit, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, fetchOpts).then(async (response) => {
            const responseText = await response.text();
            if (response.status === 200) {
                const responseJson = JSON.parse(responseText);
                if (!responseJson.error) {
                    resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseText });
                    return;
                }
            }
            reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseText });
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
        return false;
    }
}
