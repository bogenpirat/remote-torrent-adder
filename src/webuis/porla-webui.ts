import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type TorrentAddingResult } from "../models/webui";
import { blobToBase64 } from "../util/converter";
import { JsonLoginWebUI, type LoginAnswer } from "./json-login-webui";
import { createJsonPostOptions, fetchOrThrow, toFailureResult } from "../models/webui-http";

export class PorlaWebUI extends JsonLoginWebUI {
    protected get loginUrl(): string {
        return this.createBaseUrl() + "/api/v1/auth/login";
    }

    protected isLoginAccepted(answer: LoginAnswer): boolean {
        return !answer["error"] && !!answer["token"];
    }

    protected override describeRejectedLogin(answer: LoginAnswer): string {
        return answer["error"] ? String(answer["error"]) : super.describeRejectedLogin(answer);
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const jsonRpcToken = await this.authenticateForToken();
            const fetchOptions = await this.createTorrentFetchOptions(jsonRpcToken, torrent, config);
            const response = await fetchOrThrow(this.createBaseUrl() + "/api/v1/jsonrpc", fetchOptions);

            const responseText = await response.text();
            const responseJson = JSON.parse(responseText);
            return {
                success: !responseJson.error,
                httpResponseCode: response.status,
                httpResponseBody: responseText,
            };
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private async authenticateForToken(): Promise<string> {
        const answer = await this.authenticate();
        return answer["token"] as string;
    }

    private async createTorrentFetchOptions(jsonRpcToken: string, torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const payload = torrent.isMagnet
            ? this.createPayloadForMagnet(torrent.data as string, config)
            : await this.createPayloadForTorrent(torrent, config);

        return createJsonPostOptions(payload, { "Authorization": "Bearer " + jsonRpcToken });
    }

    private createPayloadForMagnet(magnetUri: string, config: TorrentUploadConfig): Record<string, unknown> {
        return {
            jsonrpc: "2.0",
            method: "torrents.add",
            id: Math.floor(Date.now() / 1000),
            params: {
                magnet_uri: magnetUri,
                preset: "",
                save_path: this.getDirectory(config) ?? "./"
            }
        };
    }

    private async createPayloadForTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<Record<string, unknown>> {
        return {
            jsonrpc: "2.0",
            method: "torrents.add",
            id: Math.floor(Date.now() / 1000),
            params: {
                ti: await blobToBase64(torrent.data as Blob),
                preset: "",
                save_path: this.getDirectory(config) ?? "./"
            }
        };
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
