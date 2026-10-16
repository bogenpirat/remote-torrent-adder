import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { fetchOrThrow, toFailureResult } from "../models/webui-http";
import { JsonLoginWebUI, type LoginAnswer } from "./json-login-webui";

export class QNAPDownloadStationWebUI extends JsonLoginWebUI {
    protected get loginUrl(): string {
        return this.createQNAPDownloadStationBaseUrl() + "/Misc/Login";
    }

    protected isLoginAccepted(answer: LoginAnswer): boolean {
        return !!answer["sid"];
    }

    protected override createLoginFetchOptions(): RequestInit {
        const payload = new FormData();
        payload.append("user", this.settings.username);
        payload.append("pass", btoa(this.settings.password));
        return { method: "POST", body: payload };
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const sessionId = await this.authenticateForSessionId();
            const fetchOptions = await this.createTorrentFetchOptions(sessionId, torrent, config);
            const response = await fetchOrThrow(this.createAddingUrlForTorrent(torrent), fetchOptions);

            const responseText = await response.text();
            const errorCode = JSON.parse(responseText)["error"];
            return {
                success: errorCode === 0 || errorCode === 8196,
                httpResponseCode: response.status,
                httpResponseBody: responseText,
            };
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private createQNAPDownloadStationBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/downloadstation/V4",
        ].join("");
    }

    private async authenticateForSessionId(): Promise<string> {
        const answer = await this.authenticate();
        return String(answer["sid"]);
    }

    private createAddingUrlForTorrent(torrent: Torrent): string {
        return this.createQNAPDownloadStationBaseUrl() + (torrent.isMagnet ? "/Task/AddUrl" : "/Task/AddTorrent");
    }

    private async createTorrentFetchOptions(sessionId: string, torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const payload = new FormData();
        payload.append("sid", sessionId);

        const directory = this.getDirectory(config);
        if (directory) {
            payload.append("temp", directory);
            payload.append("move", directory);
        }

        if (torrent.isMagnet) {
            payload.append("url", torrent.data as string);
        } else {
            const fileContents = new Blob([await (torrent.data as Blob).arrayBuffer()], { type: "application/octet-stream" });
            payload.append("file", fileContents, torrent.name);
        }

        return {
            method: 'POST',
            body: payload
        } as RequestInit;
    }

    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return true;
    }

    get isAddPausedSupported(): boolean {
        return false;
    }
}
