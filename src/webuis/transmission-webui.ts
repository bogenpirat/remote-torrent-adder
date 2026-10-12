import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { blobToBase64 } from "../util/converter";
import { createJsonPostOptions, fetchOrThrow, HttpError, toFailureResult } from "../models/webui-http";
import { BasicAuthWebUI } from "./basic-auth-webui";

export const TRANSMISSION_RPC_PATH = "/transmission/rpc";
const SESSION_ID_HEADER = "X-Transmission-Session-Id";
const HTTP_OK = 200;
const HTTP_SESSION_ID_REQUIRED = 409;

export function isSessionHandshakeStatus(status: number): boolean {
    return status === HTTP_OK || status === HTTP_SESSION_ID_REQUIRED;
}

export class TransmissionWebUI extends BasicAuthWebUI {
    protected readonly connectionProbePath = TRANSMISSION_RPC_PATH;

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const sessionId = await this.fetchTransmissionSessionId();
            const fetchOptions = await this.createTorrentFetchOptions(torrent, config, sessionId);
            const response = await fetchOrThrow(this.createBaseUrl() + TRANSMISSION_RPC_PATH, fetchOptions);

            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            return {
                success: responseData["result"] === "success",
                httpResponseCode: response.status,
                httpResponseBody: responseText,
            };
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private async fetchTransmissionSessionId(): Promise<string> {
        const response = await fetch(this.createBaseUrl() + TRANSMISSION_RPC_PATH, { method: "POST", body: "" });
        if (!isSessionHandshakeStatus(response.status)) {
            throw new HttpError(response.status, await response.text());
        }
        return response.headers.get(SESSION_ID_HEADER) ?? "";
    }

    private async createTorrentFetchOptions(
        torrent: Torrent,
        config: TorrentUploadConfig,
        transmissionSessionId: string,
    ): Promise<RequestInit> {
        const payload = {
            method: "torrent-add",
            arguments: await this.createAddArguments(torrent, config)
        };

        return createJsonPostOptions(payload, { [SESSION_ID_HEADER]: transmissionSessionId });
    }

    private async createAddArguments(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, string | boolean>> {
        const addArguments: Record<string, string | boolean> = torrent.isMagnet
            ? { filename: torrent.data as string }
            : { metainfo: await blobToBase64(torrent.data as Blob) };

        const directory = this.getDirectory(config);
        if (directory) {
            addArguments["download-dir"] = directory;
        }

        addArguments["paused"] = this.getAddPaused(config);
        return addArguments;
    }

    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return true;
    }

    get isAddPausedSupported(): boolean {
        return true;
    }
}
