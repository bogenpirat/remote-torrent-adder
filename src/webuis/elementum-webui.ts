import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { fetchOrThrow, toFailureResult } from "../models/webui-http";

export class ElementumWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createElementumBaseUrl();
            const payload = torrent.isMagnet
                ? this.createPayloadForMagnet(torrent.data as string, config)
                : this.createPayloadForTorrent(torrent);

            const response = await fetchOrThrow(url, { method: 'POST', body: payload });
            return { success: true, httpResponseCode: response.status, httpResponseBody: await response.text() };
        } catch (error) {
            return toFailureResult(error);
        }
    }

    createElementumBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/playuri"
        ].join("");
    }

    createPayloadForMagnet(magnetUri: string, _config: TorrentUploadConfig): FormData {
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
