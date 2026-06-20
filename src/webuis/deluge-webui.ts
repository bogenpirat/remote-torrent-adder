import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";


export class DelugeWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            await this.authenticate();

            const pathOrMagnet = torrent.isMagnet
                ? (torrent.data as string)
                : await this.uploadTorrentFile(torrent);

            let result = await this.startUploadedTorrent(pathOrMagnet, config);

            const label = this.getLabel(config);
            if (result.success && label) {
                result = await this.setLabelForUploadedTorrent(result.httpResponseBody ?? "", label.toLowerCase());
            }

            return result;
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private async authenticate(): Promise<void> {
        const payload = {
            method: "auth.login",
            params: [this._settings.password],
            id: this.randomId()
        };
        const response = await this.fetch(this.createBaseUrl() + "/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if ((await response.json())["result"] !== true) {
            throw new Error("Authentication failed");
        }
    }

    private async uploadTorrentFile(torrent: Torrent): Promise<string> {
        const payload = new FormData();
        payload.append("file", new Blob([torrent.data], { type: "application/x-bittorrent" }), torrent.name);
        const response = await this.fetch(this.createBaseUrl() + "/upload", { method: "POST", body: payload });
        const responseJson = await response.json();
        if (!(responseJson["success"] === true && responseJson["files"].length > 0)) {
            throw new Error("File upload failed");
        }
        return responseJson["files"][0];
    }

    private async startUploadedTorrent(uploadedFilePathOrMagnetLink: string, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        const jsonUrl = this.createBaseUrl() + "/json";
        const payload = {
            method: "web.add_torrents",
            params: [
                [
                    {
                        path: uploadedFilePathOrMagnetLink,
                        options: {
                            add_paused: this.getAddPaused(config),
                        } as Record<string, unknown>
                    }
                ]
            ],
            id: this.randomId()
        };
        if (this.getDirectory(config)) {
            payload.params[0][0].options["download_location"] = this.getDirectory(config);
        }

        const response = await this.fetch(jsonUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const responseJson = await response.json();
        const responseText = JSON.stringify(responseJson);
        const success = !!(responseJson["result"] && responseJson["result"].length > 0
            && responseJson["result"][0].length > 0 && responseJson["result"][0][0] === true);
        return { success, httpResponseCode: response.status, httpResponseBody: responseText };
    }

    private async setLabelForUploadedTorrent(startUploadedTorrentResponseJson: string, label: string): Promise<TorrentAddingResult> {
        const startUploadedTorrentResponse = JSON.parse(startUploadedTorrentResponseJson);
        await this.fetch(this.createBaseUrl() + "/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                method: "label.add",
                params: [label],
                id: this.randomId()
            })
        });
        const response = await this.fetch(this.createBaseUrl() + "/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                method: "label.set_torrent",
                params: [startUploadedTorrentResponse["result"][0][1], label],
                id: this.randomId()
            })
        });
        return { success: true, httpResponseCode: response.status, httpResponseBody: JSON.stringify(startUploadedTorrentResponse) };
    }

    private randomId(): number {
        return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER + 1));
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
