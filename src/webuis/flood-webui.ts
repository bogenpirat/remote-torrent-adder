import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { ConnectionTestResult, TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class FloodWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.createBaseUrl() + "/api/auth/authenticate", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=UTF-8" },
                body: JSON.stringify({ username: this._settings.username, password: this._settings.password })
            });
            if (!response.ok) {
                return this.toReachableResult(false, response.status);
            }
            const json = await response.json();
            return this.toReachableResult(json.success === true, response.status);
        } catch (error) {
            return this.toUnreachableResult(error);
        }
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createBaseUrl() + (torrent.isMagnet ? "/api/torrents/add-urls" : "/api/torrents/add-files");

            await this.authenticate();
            const fetchOpts = await this.createTorrentFetchOptions(torrent, config);
            const response = await this.fetch(url, fetchOpts);

            const success = response.status === 200 || response.status === 202;
            return {
                success,
                httpResponseCode: response.status,
                httpResponseBody: success ? null : await response.text(),
            };
        } catch (error) {
            return this.toFailureResult(error);
        }
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

    private async createTorrentFetchOptions(torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const body = torrent.isMagnet
            ? JSON.stringify(this.createPayloadForMagnet(torrent.data as string, config))
            : JSON.stringify(await this.createPayloadForTorrent(torrent, config));

        return {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body
        };
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
