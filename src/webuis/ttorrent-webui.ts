import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class TTorrentWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            let url = this.createTTorrentBaseUrl();
            let payload: FormData;
            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent);
                url += "/downloadFromUrl";
            } else {
                payload = await this.createPayloadForTorrent(torrent);
                url += "/downloadTorrent";
            }

            const response = await this.fetch(url, { method: 'POST', body: payload });
            return { success: true, httpResponseCode: response.status, httpResponseBody: await response.text() };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private createTTorrentBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/cmd"
        ].join("");
    }

    private async createPayloadForTorrent(torrent: Torrent): Promise<FormData> {
        const payload = new FormData();
        payload.append("torrentfile", torrent.data as Blob, torrent.name);
        return payload;
    }

    private createPayloadForMagnet(torrent: Torrent): FormData {
        const payload = new FormData();
        payload.append("url", torrent.data as string);
        return payload;
    }

    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return false;
    }

    get isAddPausedSupported(): boolean {
        return false;
    }
}
