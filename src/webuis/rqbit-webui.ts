import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { createBasicAuthHeaders, fetchOrThrow, toFailureResult } from "../models/webui-http";
import { BasicAuthWebUI } from "./basic-auth-webui";

export class RqbitWebUI extends BasicAuthWebUI {
    protected readonly connectionProbePath = "/torrents";

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createBaseUrl() + "/torrents" + this.createQueryString(config);
            const response = await fetchOrThrow(url, this.createTorrentFetchOptions(torrent));
            return {success: true, httpResponseCode: response.status, httpResponseBody: await response.text()};
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private createQueryString(config: TorrentUploadConfig): string {
        const params = new URLSearchParams();

        const dir = this.getDirectory(config);
        if (dir) {
            params.append("output_folder", dir);
        }

        params.append("paused", this.getAddPaused(config).toString());

        const query = params.toString();
        return query ? `?${query}` : "";
    }

    private createTorrentFetchOptions(torrent: Torrent): RequestInit {
        const fetchOpts: RequestInit = {
            method: "POST",
            headers: createBasicAuthHeaders(this.settings),
        };

        fetchOpts.body = torrent.isMagnet ? (torrent.data as string) : (torrent.data as Blob);

        return fetchOpts;
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
