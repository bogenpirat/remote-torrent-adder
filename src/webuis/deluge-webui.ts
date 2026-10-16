import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { fetchOrThrow, toFailureResult } from "../models/webui-http";
import { JsonLoginWebUI, type LoginAnswer } from "./json-login-webui";

export class DelugeWebUI extends JsonLoginWebUI {
    protected get loginUrl(): string {
        return this.jsonRpcUrl;
    }

    protected isLoginAccepted(answer: LoginAnswer): boolean {
        return answer["result"] === true;
    }

    protected override createLoginFetchOptions(): RequestInit {
        return this.createJsonRpcFetchOptions("auth.login", [this.settings.password]);
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
                result = await this.setLabelForUploadedTorrent(result.httpResponseBody ?? "", label.toLowerCase());
            }

            return result;
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private async uploadTorrentFile(torrent: Torrent): Promise<string> {
        const payload = new FormData();
        payload.append("file", new Blob([torrent.data], { type: "application/x-bittorrent" }), torrent.name);
        const response = await fetchOrThrow(this.createBaseUrl() + "/upload", { method: "POST", body: payload });
        const responseJson = await response.json();
        if (!(responseJson["success"] === true && responseJson["files"].length > 0)) {
            throw new Error("File upload failed");
        }
        return responseJson["files"][0];
    }

    private async startUploadedTorrent(uploadedFilePathOrMagnetLink: string, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        const torrentToAdd = { path: uploadedFilePathOrMagnetLink, options: this.createAddOptions(config) };
        const response = await this.postJsonRpc("web.add_torrents", [[torrentToAdd]]);
        const responseJson = await response.json();
        const responseText = JSON.stringify(responseJson);
        const success = !!(responseJson["result"] && responseJson["result"].length > 0
            && responseJson["result"][0].length > 0 && responseJson["result"][0][0] === true);
        return { success, httpResponseCode: response.status, httpResponseBody: responseText };
    }

    private createAddOptions(config: TorrentUploadConfig): Record<string, unknown> {
        const options: Record<string, unknown> = {
            add_paused: this.getAddPaused(config),
        };
        const directory = this.getDirectory(config);
        if (directory) {
            options["download_location"] = directory;
        }
        return options;
    }

    private async setLabelForUploadedTorrent(startUploadedTorrentResponseJson: string, label: string): Promise<TorrentAddingResult> {
        const startUploadedTorrentResponse = JSON.parse(startUploadedTorrentResponseJson);
        await this.postJsonRpc("label.add", [label]);
        const response = await this.postJsonRpc("label.set_torrent", [startUploadedTorrentResponse["result"][0][1], label]);
        return { success: true, httpResponseCode: response.status, httpResponseBody: JSON.stringify(startUploadedTorrentResponse) };
    }

    private postJsonRpc(method: string, params: unknown[]): Promise<Response> {
        return fetchOrThrow(this.jsonRpcUrl, this.createJsonRpcFetchOptions(method, params));
    }

    private get jsonRpcUrl(): string {
        return this.createBaseUrl() + "/json";
    }

    private createJsonRpcFetchOptions(method: string, params: unknown[]): RequestInit {
        return {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method, params, id: this.randomId() })
        };
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
