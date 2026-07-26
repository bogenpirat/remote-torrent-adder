import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { ConnectionTestResult, TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class RuTorrentWebUI extends TorrentWebUI {
    public override testConnection(): Promise<ConnectionTestResult> {
        return this.probeWithBasicAuth(this.createBaseUrl() + "/");
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createRutorrentBaseUrl(config);
            let payload: string | FormData;
            let headers: Record<string, string> = {};

            if (torrent.isMagnet) {
                payload = this.createPayloadForMagnet(torrent.data as string);
                headers = { "Content-Type": "application/x-www-form-urlencoded" };
            } else {
                payload = this.createPayloadForTorrent(torrent, config);
            }

            const response = await this.fetch(url, { method: 'POST', headers, body: payload });
            const responseBody = await response.text();
            const success = /result\[\]=Success/.test(response.url) || /addTorrentSuccess/.test(responseBody);
            return { success, httpResponseCode: response.status, httpResponseBody: responseBody };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    createRutorrentBaseUrl(config: TorrentUploadConfig): string {
        const targetDir = this.getDirectory(config);
        const targetLabel = this.getLabel(config);
        const addPaused = this.getAddPaused(config);
        return [
            this.createBaseUrl(),
            "/php/addtorrent.php?",
            targetDir ? `dir_edit=${encodeURIComponent(targetDir)}&` : "",
            targetLabel ? `label=${encodeURIComponent(targetLabel)}&` : "",
            addPaused ? "torrents_start_stopped=1&" : "",
            this._settings.clientSpecificSettings["dontAddNamePath"] ? "not_add_path=1&" : "", // TODO: what
        ].join("");
    }

    createPayloadForMagnet(magnetUri: string): string {
        return `url=${encodeURIComponent(magnetUri)}`;
    }

    createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): FormData {
        const message = new FormData();

        const dir = this.getDirectory(config);
        if (dir) {
            message.append("dir_edit", dir);
        }

        const label = this.getLabel(config);
        if (label) {
            message.append("label", label);
        }

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
        const filename = torrent.name;
        message.append("torrent_file", blobData, filename);

        return message;
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
