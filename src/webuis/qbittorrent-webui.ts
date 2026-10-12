import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ClientSpecificSettingDescriptor, type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import { fetchOrThrow, toAuthenticatedResult, toFailureResult, toRejectedResult, toUnreachableResult } from "../models/webui-http";

const CLIENT_SPECIFIC_SETTINGS: ReadonlyArray<ClientSpecificSettingDescriptor> = [
    {
        key: "forceStart",
        label: "Force start",
        type: "boolean",
        default: false,
        perTorrent: true,
        description: "Bypass the queueing system and start immediately. Needs WebAPI 2.11 or newer; older servers ignore it.",
    },
];

export class QBittorrentWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const body = new URLSearchParams();
            body.append("username", this._settings.username);
            body.append("password", this._settings.password);
            const response = await fetch(this.createBaseUrl() + "/api/v2/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
                body
            });
            return response.ok ? toAuthenticatedResult(response.status) : toRejectedResult(response.status);
        } catch (error) {
            return toUnreachableResult(error);
        }
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            await this.authenticate();
            const fetchOpts = await this.createTorrentFetchOptions(torrent, config);
            const response = await fetchOrThrow(this.createBaseUrl() + "/api/v2/torrents/add", fetchOpts);

            const responseBody = await response.text();
            return {
                success: responseBody !== "Fails.",
                httpResponseCode: response.status,
                httpResponseBody: responseBody,
            };
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private async authenticate(): Promise<void> {
        const authenticationBody = new URLSearchParams();
        authenticationBody.append("username", this._settings.username);
        authenticationBody.append("password", this._settings.password);
        await fetchOrThrow(this.createBaseUrl() + "/api/v2/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            },
            body: authenticationBody
        });
    }

    private async createTorrentFetchOptions(torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        const body = new FormData();
        if (torrent.isMagnet) {
            body.append("urls", torrent.data as string);
        } else {
            body.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
        }
        for (const [name, value] of this.createUploadConfigFields(config)) {
            body.append(name, value);
        }

        return { method: "POST", body };
    }

    private createUploadConfigFields(config: TorrentUploadConfig): Array<[string, string]> {
        const candidates: Array<[string, string | undefined]> = [
            ["savepath", this.getDirectory(config)],
            ["category", this.getLabel(config)],
            ["stopped", this.getAddPaused(config).toString()],
            ["forced", this.getClientSpecific("forceStart", config) ? "true" : undefined],
        ];
        return candidates.filter((field): field is [string, string] => !!field[1]);
    }

    override get clientSpecificSettingDescriptors(): ReadonlyArray<ClientSpecificSettingDescriptor> {
        return CLIENT_SPECIFIC_SETTINGS;
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
