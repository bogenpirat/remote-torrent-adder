import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { blobToBase64 } from "../util/converter";

export class TransmissionWebUI extends TorrentWebUI {
    public override testConnection(): Promise<ConnectionTestResult> {
        return this.probeWithBasicAuth(this.createBaseUrl() + "/transmission/rpc");
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const sessionId = await this.fetchTransmissionSessionId();
            const fetchOpts = await this.createTorrentFetchOptions(torrent, config, sessionId);
            const response = await this.fetch(this.createBaseUrl() + "/transmission/rpc", fetchOpts);

            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            const success = responseData["result"] === "success";
            const label = this.getLabel(config);
            if (success && label) {
                const addedArguments: Record<string, { hashString?: string }> = responseData["arguments"];
                const hashString = (addedArguments["torrent-added"] ?? addedArguments["torrent-duplicate"])?.hashString;
                const labelResult = await this.setLabelWithSessionId(hashString, label, sessionId);
                return { ...labelResult, httpResponseBody: responseText };
            }
            return {
                success,
                httpResponseCode: response.status,
                httpResponseBody: responseText,
            };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    public override async setLabel(infoHash: string, label: string): Promise<TorrentAddingResult> {
        try {
            return await this.setLabelWithSessionId(infoHash, label, await this.fetchTransmissionSessionId());
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private async setLabelWithSessionId(hashString: string | undefined, label: string, sessionId: string): Promise<TorrentAddingResult> {
        const response = await this.fetch(this.createBaseUrl() + "/transmission/rpc", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "X-Transmission-Session-Id": sessionId
            },
            body: JSON.stringify({ method: "torrent-set", arguments: { ids: [hashString], labels: [label] } })
        });
        const responseText = await response.text();
        return {
            success: JSON.parse(responseText)["result"] === "success",
            httpResponseCode: response.status,
            httpResponseBody: responseText,
        };
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

    private async createTorrentFetchOptions(torrent: Torrent, config: TorrentUploadConfig, transmissionSessionId: string): Promise<RequestInit> {
        const payload: Record<string, string | Record<string, string | boolean>> = {
            method: "torrent-add",
            arguments: {}
        };
        if (torrent.isMagnet) {
            payload["arguments"] = {
                filename: torrent.data as string
            };
        } else {
            payload["arguments"] = {
                metainfo: await blobToBase64(torrent.data as Blob)
            };
        }

        const dir = this.getDirectory(config);
        if (dir) {
            payload["arguments"]["download-dir"] = dir;
        }

        const addPaused = this.getAddPaused(config);
        if (addPaused !== null) {
            payload["arguments"]["paused"] = addPaused;
        }

        return {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "X-Transmission-Session-Id": transmissionSessionId
            },
            body: JSON.stringify(payload)
        };
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
