import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class QBittorrentWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            await this.authenticate();
            const fetchOpts = await this.createTorrentFetchOptions(torrent, config);
            const response = await this.fetch(this.createBaseUrl() + "/api/v2/torrents/add", fetchOpts);

            const responseBody = await response.text();
            return {
                success: responseBody !== "Fails.",
                httpResponseCode: response.status,
                httpResponseBody: responseBody,
            };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private async authenticate(): Promise<void> {
        const authenticationBody = new URLSearchParams();
        authenticationBody.append("username", this._settings.username);
        authenticationBody.append("password", this._settings.password);
        await this.fetch(this.createBaseUrl() + "/api/v2/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            },
            body: authenticationBody
        });
    }

    private async createTorrentFetchOptions(torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const body = new FormData();
        if (torrent.isMagnet) {
            body.append("urls", torrent.data as string);
        } else {
            body.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
        }

        const dir = this.getDirectory(config);
        if (dir) {
            body.append("savepath", dir);
        }

        const label = this.getLabel(config);
        if (label) {
            body.append("category", label);
        }

        const addPaused = this.getAddPaused(config);
        if (addPaused !== null) {
            body.append("stopped", addPaused.toString());
        }

        return { method: "POST", body };
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
