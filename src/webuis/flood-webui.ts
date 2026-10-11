import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { blobToBase64 } from "../util/converter";
import { JsonLoginWebUI, type LoginAnswer } from "./json-login-webui";

export class FloodWebUI extends JsonLoginWebUI {
    protected get loginUrl(): string {
        return this.createBaseUrl() + "/api/auth/authenticate";
    }

    protected isLoginAccepted(answer: LoginAnswer): boolean {
        return answer["success"] === true;
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

    private async authenticate(): Promise<void> {
        const answer = await this.login();
        if (!answer["success"]) {
            throw new Error("Authentication failed");
        }
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

    private createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): Record<string, unknown> {
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

    private async createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, unknown>> {
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
