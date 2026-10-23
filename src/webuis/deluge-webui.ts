import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";


export class DelugeWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.createBaseUrl() + "/json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method: "auth.login", params: [this._settings.password], id: this.randomId() })
            });
            if (!response.ok) {
                return this.toReachableResult(false, response.status);
            }
            const json = await response.json();
            return this.toReachableResult(json["result"] === true, response.status);
        } catch (error) {
            return this.toUnreachableResult(error);
        }
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            await this.authenticate();

            const pathOrMagnet = torrent.isMagnet
                ? (torrent.data as string)
                : await this.uploadTorrentFile(torrent);

            let result = await this.startUploadedTorrent(pathOrMagnet, config);

            const label = this.getLabel(config);
            if (result.success && label) {
                const torrentId: string = JSON.parse(result.httpResponseBody ?? "")["result"][0][1];
                const labelResult = await this.setLabelOnAuthenticatedSession(torrentId, label);
                result = { ...labelResult, httpResponseBody: result.httpResponseBody };
            }

            return result;
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    public override async setLabel(infoHash: string, label: string): Promise<TorrentAddingResult> {
        try {
            await this.authenticate();
            return await this.setLabelOnAuthenticatedSession(infoHash.toLowerCase(), label);
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
        const options: Record<string, unknown> = {
            add_paused: this.getAddPaused(config),
        };
        const directory = this.getDirectory(config);
        if (directory) {
            options["download_location"] = directory;
        }
        const payload = {
            method: "web.add_torrents",
            params: [
                [
                    {
                        path: uploadedFilePathOrMagnetLink,
                        options
                    }
                ]
            ],
            id: this.randomId()
        };

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

    private async setLabelOnAuthenticatedSession(torrentId: string, label: string): Promise<TorrentAddingResult> {
        const delugeLabel = label.toLowerCase();
        await this.fetch(this.createBaseUrl() + "/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                method: "label.add",
                params: [delugeLabel],
                id: this.randomId()
            })
        });
        const response = await this.fetch(this.createBaseUrl() + "/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                method: "label.set_torrent",
                params: [torrentId, delugeLabel],
                id: this.randomId()
            })
        });
        const responseText = await response.text();
        return { success: !JSON.parse(responseText || "{}")["error"], httpResponseCode: response.status, httpResponseBody: responseText };
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
