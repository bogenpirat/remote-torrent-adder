import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class RqbitWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise((resolve, reject) => {
            const url = this.createBaseUrl() + "/torrents" + this.createQueryString(config);
            const fetchOpts = this.createTorrentFetchOptions(torrent);
            this.sendRequest(url, fetchOpts, resolve, reject);
        });
    }

    private createQueryString(config: TorrentUploadConfig): string {
        const params = new URLSearchParams();

        const dir = this.getDirectory(config);
        if (dir) {
            params.append("output_folder", dir);
        }

        const addPaused = this.getAddPaused(config);
        if (addPaused !== null) {
            params.append("paused", addPaused.toString());
        }

        const query = params.toString();
        return query ? `?${query}` : "";
    }

    private createTorrentFetchOptions(torrent: Torrent): RequestInit {
        const fetchOpts: RequestInit = {
            method: "POST",
            headers: this.createAuthHeaders(),
        };

        // rqbit accepts the magnet/URL as a plain-text body or the raw .torrent
        // file bytes, and decides how to handle it by inspecting the payload.
        fetchOpts.body = torrent.isMagnet ? (torrent.data as string) : (torrent.data as Blob);

        return fetchOpts;
    }

    private createAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        if (this._settings.username || this._settings.password) {
            headers["Authorization"] = "Basic " + btoa(`${this._settings.username}:${this._settings.password}`);
        }
        return headers;
    }

    private sendRequest(url: string, fetchOpts: RequestInit, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, fetchOpts).then(async (response) => {
            const responseBody = await response.text();
            resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseBody });
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
