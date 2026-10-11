import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";
import { fetchOrThrow, probeWithBasicAuth, toFailureResult } from "../models/webui-http";

export class TransmissionWebUI extends TorrentWebUI {
    public override testConnection(): Promise<ConnectionTestResult> {
        return probeWithBasicAuth(this.createBaseUrl() + "/transmission/rpc", this.settings);
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const sessionId = await this.fetchTransmissionSessionId();
            const fetchOpts = await this.createTorrentFetchOptions(torrent, config, sessionId);
            const response = await fetchOrThrow(this.createBaseUrl() + "/transmission/rpc", fetchOpts);

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

    private fetchTransmissionSessionId(): Promise<string> {
        return new Promise((resolve, reject) => {
            const rpcUrl = this.createBaseUrl() + "/transmission/rpc";
            fetch(rpcUrl, {
                method: "POST",
                body: ""
            }).then(response => {
                if (response.status === 200 || response.status === 409) {
                    const sessionId = response.headers.get("X-Transmission-Session-Id") ?? "";
                    resolve(sessionId);
                } else {
                    reject(new Error("Authentication failed"));
                }
            }).catch(error => {
                reject(error);
            });
        });
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

        return {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "X-Transmission-Session-Id": transmissionSessionId
            },
            body: JSON.stringify(payload)
        };
    }

    private async createAddArguments(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, string | boolean>> {
        const addArguments: Record<string, string | boolean> = torrent.isMagnet
            ? { filename: torrent.data as string }
            : { metainfo: await blobToBase64(torrent.data as Blob) };

        const dir = this.getDirectory(config);
        if (dir) {
            addArguments["download-dir"] = dir;
        }

        const addPaused = this.getAddPaused(config);
        if (addPaused !== null) {
            addArguments["paused"] = addPaused;
        }
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
