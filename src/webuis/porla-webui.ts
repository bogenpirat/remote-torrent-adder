import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class PorlaWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.createBaseUrl() + "/api/v1/jsonrpc", this.createLoginRequest());
            if (!response.ok) {
                return this.toReachableResult(false, response.status);
            }
            const json = await response.json();
            return this.toReachableResult(!json.error && !!json.result?.token, response.status);
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

    public override async setLabel(infoHash: string, label: string): Promise<TorrentAddingResult> {
        try {
            const jsonRpcToken = await this.authenticateForToken();
            const response = await this.fetch(this.createBaseUrl() + "/api/v1/jsonrpc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Authorization": "Bearer " + jsonRpcToken
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "torrents.properties.set",
                    id: Math.floor(Date.now() / 1000),
                    params: {
                        info_hash: infoHash.toLowerCase(),
                        category: label
                    }
                })
            });
            const responseText = await response.text();
            return {
                success: !JSON.parse(responseText).error,
                httpResponseCode: response.status,
                httpResponseBody: responseText,
            };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private authenticateForToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.fetch(this.createBaseUrl() + "/api/v1/jsonrpc", this.createLoginRequest()).then(response =>
                response.json()
            ).then(json => {
                if (json.error) {
                    reject(new Error(json.error.message ?? "Authentication failed"));
                } else {
                    resolve(json.result.token);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private createLoginRequest(): RequestInit {
        return {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "auth.login",
                id: Math.floor(Date.now() / 1000),
                params: {
                    username: this._settings.username,
                    password: this._settings.password
                }
            })
        };
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

    private createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): Record<string, unknown> {
        return {
            jsonrpc: "2.0",
            method: "torrents.add",
            id: Math.floor(Date.now() / 1000),
            params: {
                magnet_uri: magnetUri,
                save_path: this.getDirectory(config) ?? "./",
                ...this.createCategoryParam(config)
            }
        };
    }

    private async createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, unknown>> {
        return {
            jsonrpc: "2.0",
            method: "torrents.add",
            id: Math.floor(Date.now() / 1000),
            params: {
                ti: await blobToBase64(torrent.data as Blob),
                save_path: this.getDirectory(config) ?? "./",
                ...this.createCategoryParam(config)
            }
        };
    }

    private createCategoryParam(config: TorrentUploadConfig): Record<string, string> {
        const label = this.getLabel(config);
        return label ? { category: label } : {};
    }

    get isLabelSupported(): boolean {
        return true;
    }

    get isDirSupported(): boolean {
        return true;
    }

    get isAddPausedSupported(): boolean {
        return false;
    }
}
