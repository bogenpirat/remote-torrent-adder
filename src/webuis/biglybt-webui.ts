import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { fetchOrThrow, HttpError, toFailureResult } from "../models/webui-http";
import { BasicAuthWebUI } from "./basic-auth-webui";
import { isSessionHandshakeStatus, TRANSMISSION_RPC_PATH } from "./transmission-webui";

const UPLOAD_PATH = "/transmission/upload";

export class BiglyBTWebUI extends BasicAuthWebUI {
    protected readonly connectionProbePath = TRANSMISSION_RPC_PATH;

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const url = this.createAddUrl(torrent, config);

            await this.fetchSessionCookie(url);

            const payload = torrent.isMagnet
                ? this.createPayloadForMagnet(torrent.data as string, config)
                : this.createPayloadForTorrent(torrent);

            const response = await fetchOrThrow(url, { method: 'POST', body: payload });
            const responseBody = await response.text();
            return {
                success: this.isSuccessResponse(responseBody),
                httpResponseCode: response.status,
                httpResponseBody: responseBody,
            };
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private createAddUrl(torrent: Torrent, config: TorrentUploadConfig): string {
        return [
            this.createBaseUrl(),
            torrent.isMagnet ? TRANSMISSION_RPC_PATH : UPLOAD_PATH,
            !torrent.isMagnet && this.getAddPaused(config) ? "?paused=true" : "",
        ].join("");
    }

    private async fetchSessionCookie(addUrl: string): Promise<void> {
        const response = await fetch(addUrl);
        if (!isSessionHandshakeStatus(response.status)) {
            throw new HttpError(response.status, await response.text());
        }
    }

    private createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): string {
        return JSON.stringify({
            "method": "torrent-add",
            "arguments": { "paused": `${this.getAddPaused(config)}`, "filename": magnetUri }
        });
    }

    private createPayloadForTorrent(torrent: Torrent): FormData {
        const payload = new FormData();

        const blobData = new Blob([torrent.data], { type: "application/x-bittorrent" });
        payload.append("torrent_files[]", blobData, torrent.name);

        return payload;
    }

    private isSuccessResponse(responseBody: string): boolean {
        if (/<h1>200: OK<\/h1>/.test(responseBody)) {
            return true;
        }
        try {
            return JSON.parse(responseBody)["result"] === "success";
        } catch {
            return false;
        }
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
