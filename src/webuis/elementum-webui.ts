import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class ElementumWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createElementumBaseUrl(torrent);
            const payload = torrent.isMagnet
                ? this.createPayloadForMagnet(torrent.data as string, config)
                : this.createPayloadForTorrent(torrent);

            const response = await this.fetch(url, { method: 'POST', body: payload });
            return { success: true, httpResponseCode: response.status, httpResponseBody: await response.text() };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    createElementumBaseUrl(torrent: Torrent): string {
        return [
            this.createBaseUrl(),
            "/playuri"
        ].join("");
    }

    createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): FormData {
        const payload = new FormData();

        payload.append("uri", magnetUri);

        return payload;
    }

    createPayloadForTorrent(torrent: Torrent): FormData {
        const payload = new FormData();

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
        payload.append("file", blobData, torrent.name);

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
