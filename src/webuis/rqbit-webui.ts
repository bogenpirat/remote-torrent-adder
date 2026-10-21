import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class RqbitWebUI extends TorrentWebUI {
    public override testConnection(): Promise<ConnectionTestResult> {
        return this.probeWithBasicAuth(this.createBaseUrl() + "/torrents");
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createBaseUrl() + "/torrents" + this.createQueryString(config);
            const response = await this.fetch(url, this.createTorrentFetchOptions(torrent));
            const responseBody = await response.text();
            if (this.getAddPaused(config)) {
                await this.pauseTorrent(JSON.parse(responseBody).id);
            }
            return {success: true, httpResponseCode: response.status, httpResponseBody: responseBody};
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private createQueryString(config: TorrentUploadConfig): string {
        const params = new URLSearchParams();

        const dir = this.getDirectory(config);
        if (dir) {
            params.append("output_folder", dir);
        }

        const query = params.toString();
        return query ? `?${query}` : "";
    }

    private async pauseTorrent(id: number): Promise<void> {
        await this.fetch(this.createBaseUrl() + `/torrents/${id}/pause`, {
            method: "POST",
            headers: this.createAuthHeaders(),
        });
    }

    private createTorrentFetchOptions(torrent: Torrent): RequestInit {
        const fetchOpts: RequestInit = {
            method: "POST",
            headers: this.createAuthHeaders(),
        };

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
