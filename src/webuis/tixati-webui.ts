import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class TixatiWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const payload = torrent.isMagnet
                ? this.createPayloadForMagnet(torrent)
                : await this.createPayloadForTorrent(torrent);
            payload.append("noautostart", this.getAddPaused(config) === true ? "1" : "0");

            const response = await this.fetch(this.createTixatiBaseUrl(), { method: 'POST', body: payload });
            return { success: true, httpResponseCode: response.status, httpResponseBody: await response.text() };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private createTixatiBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/transfers/action"
        ].join("");
    }

    private async createPayloadForTorrent(torrent: Torrent): Promise<FormData> {
        const payload = new FormData();
        payload.append("addlinktext", "")
        const torrentPayload = new Blob([await (torrent.data as Blob).arrayBuffer()], { type: "application/octet-stream" });
        payload.append("metafile", torrentPayload, torrent.name);
        payload.append("addmetafile", "Add");

        return payload;
    }

    private createPayloadForMagnet(torrent: Torrent): FormData {
        const payload = new FormData();
        payload.append("addlink", "Add");
        payload.append("addlinktext", torrent.data as string);
        payload.append("metafile", new Blob(), "");

        return payload;
    }

    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return false;
    }

    get isAddPausedSupported(): boolean {
        return true;
    }
}
