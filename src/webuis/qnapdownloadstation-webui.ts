import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { fetchOrThrow, toAuthenticatedResult, toFailureResult, toRejectedResult, toUnreachableResult } from "../models/webui-http";

export class QNAPDownloadStationWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.loginUrl, this.createLoginFetchOptions());
            const isAccepted = response.ok && !!(await response.json())["sid"];
            return isAccepted ? toAuthenticatedResult(response.status) : toRejectedResult(response.status);
        } catch (error) {
            return toUnreachableResult(error);
        }
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const sessionId = await this.fetchSessionId();
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

    private createAddingUrlForTorrent(torrent: Torrent): string {
        return this.createQNAPDownloadStationBaseUrl() + (torrent.isMagnet ? "/Task/AddUrl" : "/Task/AddTorrent");
    }

    private async fetchSessionId(): Promise<string> {
        const response = await fetchOrThrow(this.loginUrl, this.createLoginFetchOptions());
        const responseJson = await response.json();
        if (!responseJson["sid"]) {
            throw new Error("Authentication failed");
        }
        return responseJson["sid"];
    }

    private get loginUrl(): string {
        return this.createQNAPDownloadStationBaseUrl() + "/Misc/Login";
    }

    private createLoginFetchOptions(): RequestInit {
        const payload = new FormData();
        payload.append("user", this.settings.username);
        payload.append("pass", btoa(this.settings.password));
        return { method: "POST", body: payload };
    }

    private async createTorrentFetchOptions(sessionId: string, torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const payload = new FormData();
        payload.append("sid", sessionId);

        const dir = this.getDirectory(config);
        if (dir) {
            payload.append("temp", dir);
            payload.append("move", dir);
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
