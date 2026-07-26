import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { ConnectionTestResult, TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class PorlaWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.createBaseUrl() + "/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=UTF-8" },
                body: JSON.stringify({ username: this._settings.username, password: this._settings.password })
            });
            if (!response.ok) {
                return this.toReachableResult(false, response.status);
            }
            const json = await response.json();
            return this.toReachableResult(!json.error && !!json.token, response.status);
        } catch (error) {
            return this.toUnreachableResult(error);
        }
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const jsonRpcToken = await this.authenticateForToken();
            const fetchOpts = await this.createTorrentFetchOptions(jsonRpcToken, torrent, config);
            const response = await this.fetch(this.createBaseUrl() + "/api/v1/jsonrpc", fetchOpts);

            const responseText = await response.text();
            const responseJson = JSON.parse(responseText);
            return {
                success: !responseJson.error,
                httpResponseCode: response.status,
                httpResponseBody: responseText,
            };
        } catch (error) {
            return this.toFailureResult(error);
        }
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

    private async createTorrentFetchOptions(jsonRpcToken: string, torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const body = torrent.isMagnet
            ? JSON.stringify(this.createPayloadForMagnet(torrent.data as string, config))
            : JSON.stringify(await this.createPayloadForTorrent(torrent, config));

        return {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "Authorization": "Bearer " + jsonRpcToken
            },
            body
        };
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
