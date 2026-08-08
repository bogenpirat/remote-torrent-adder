import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";

interface SynologyApiInfo {
    path: string;
    minVersion: number;
    maxVersion: number;
}

type SynologyApiInfoMap = Record<string, SynologyApiInfo | undefined>;

const INFO_API = "SYNO.API.Info";
const AUTH_API = "SYNO.API.Auth";
const TASK_API = "SYNO.DownloadStation.Task";
const TASK2_API = "SYNO.DownloadStation2.Task";

const COMMON_ERRORS: Record<number, string> = {
    100: "Unknown error",
    101: "Invalid parameter",
    102: "The requested API does not exist",
    103: "The requested method does not exist",
    104: "The requested version does not support the functionality",
    105: "The logged in session does not have permission",
    106: "Session timeout",
    107: "Session interrupted by duplicate login",
    119: "SID not found",
};

const AUTH_ERRORS: Record<number, string> = {
    400: "No such account or incorrect password",
    401: "Account disabled",
    402: "Permission denied",
    403: "Two-step verification is required, which is not supported yet",
    404: "Failed to authenticate the two-step verification code",
    406: "Two-factor authentication is enforced, which is not supported yet",
    407: "Blocked IP source",
    408: "Expired password cannot be changed",
    409: "Password has expired",
    410: "Password must be changed",
};

const TASK_ERRORS: Record<number, string> = {
    400: "File upload failed",
    401: "Max number of tasks reached",
    402: "Destination denied",
    403: "Destination does not exist",
    404: "Invalid task id",
    405: "Invalid task action",
    406: "No default destination",
    407: "Set destination failed",
    408: "File does not exist",
};

export class SynologyDownloadStationWebUI extends TorrentWebUI {
    private apiInfo: SynologyApiInfoMap | null = null;
    private sessionId: string | null = null;

    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const apis = await this.discoverApis();
            const response = await fetch(this.createLoginUrl(apis), this.createLoginFetchOptions(apis));
            if (!response.ok) {
                return this.toReachableResult(false, response.status);
            }

            const json = await response.json();
            if (json?.success === true && json?.data?.sid) {
                return this.toReachableResult(true, response.status);
            }

            return {
                reachable: true,
                authenticated: false,
                httpResponseCode: response.status,
                message: `Reachable, but authentication failed: ${this.describeError(json?.error?.code, AUTH_ERRORS)}`,
            };
        } catch (error) {
            return this.toUnreachableResult(error);
        }
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const apis = await this.discoverApis();
            const sessionId = await this.login(apis);

            const modernApi = apis[TASK2_API];
            if (modernApi) {
                return await this.createTaskWithModernApi(modernApi, sessionId, torrent, config);
            }
            return await this.createTaskWithLegacyApi(this.requireApi(apis, TASK_API), sessionId, torrent, config);
        } catch (error) {
            return this.toFailureResult(error);
        }
    }

    private async discoverApis(): Promise<SynologyApiInfoMap> {
        if (this.apiInfo) {
            return this.apiInfo;
        }

        const params = new URLSearchParams({
            api: INFO_API,
            version: "1",
            method: "query",
            query: [AUTH_API, TASK_API, TASK2_API].join(","),
        });
        const response = await this.fetch(`${this.createBaseUrl()}/webapi/query.cgi?${params.toString()}`);
        const json = await response.json();

        if (json?.success !== true || !json?.data) {
            throw new Error(`Could not query the Synology API list: ${this.describeError(json?.error?.code, {})}`);
        }

        this.apiInfo = json.data as SynologyApiInfoMap;
        return this.apiInfo;
    }

    private async login(apis: SynologyApiInfoMap): Promise<string> {
        if (this.sessionId) {
            return this.sessionId;
        }

        const response = await this.fetch(this.createLoginUrl(apis), this.createLoginFetchOptions(apis));
        const json = await response.json();

        if (json?.success !== true || !json?.data?.sid) {
            throw new Error(`Authentication failed: ${this.describeError(json?.error?.code, AUTH_ERRORS)}`);
        }

        this.sessionId = json.data.sid as string;
        return this.sessionId;
    }

    private createLoginUrl(apis: SynologyApiInfoMap): string {
        return `${this.createBaseUrl()}/webapi/${this.requireApi(apis, AUTH_API).path}`;
    }

    private createLoginFetchOptions(apis: SynologyApiInfoMap): RequestInit {
        const info = this.requireApi(apis, AUTH_API);
        return {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
            body: new URLSearchParams({
                api: AUTH_API,
                version: String(info.maxVersion >= 7 ? 6 : 2),
                method: "login",
                account: this._settings.username,
                passwd: this._settings.password,
                session: "DownloadStation",
                format: "sid",
            }),
        };
    }

    private async createTaskWithModernApi(
        info: SynologyApiInfo,
        sessionId: string,
        torrent: Torrent,
        config: TorrentUploadConfig,
    ): Promise<TorrentAddingResult> {
        const url = `${this.createBaseUrl()}/webapi/${info.path}`;
        const version = String(Math.min(info.maxVersion, 2));
        const destination = this.resolveDestination(config);

        if (torrent.isMagnet) {
            const params = new URLSearchParams({
                _sid: sessionId,
                api: TASK2_API,
                version,
                method: "create",
                type: "url",
                url: torrent.data as string,
                create_list: "false",
            });
            if (destination) {
                params.append("destination", destination);
            }
            return this.toTorrentAddingResult(await this.fetch(`${url}?${params.toString()}`), TASK_ERRORS);
        }

        const payload = new FormData();
        payload.append("api", TASK2_API);
        payload.append("version", version);
        payload.append("method", "create");
        payload.append("type", '"file"');
        payload.append("file", '["fileData"]');
        payload.append("create_list", "false");
        if (destination) {
            payload.append("destination", `"${destination}"`);
        }
        payload.append("fileData", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));

        const uploadUrl = `${url}?${new URLSearchParams({ _sid: sessionId }).toString()}`;
        return this.toTorrentAddingResult(await this.fetch(uploadUrl, { method: "POST", body: payload }), TASK_ERRORS);
    }

    private async createTaskWithLegacyApi(
        info: SynologyApiInfo,
        sessionId: string,
        torrent: Torrent,
        config: TorrentUploadConfig,
    ): Promise<TorrentAddingResult> {
        const url = `${this.createBaseUrl()}/webapi/${info.path}`;
        const destination = this.resolveDestination(config);

        if (torrent.isMagnet) {
            const body = new URLSearchParams({
                api: TASK_API,
                version: String(Math.min(info.maxVersion, 3)),
                method: "create",
                _sid: sessionId,
                uri: torrent.data as string,
            });
            if (destination) {
                body.append("destination", destination);
            }
            const response = await this.fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
                body,
            });
            return this.toTorrentAddingResult(response, TASK_ERRORS);
        }

        const payload = new FormData();
        payload.append("api", TASK_API);
        payload.append("version", String(Math.min(info.maxVersion, 2)));
        payload.append("method", "create");
        payload.append("_sid", sessionId);
        if (destination) {
            payload.append("destination", destination);
        }
        payload.append("file", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));

        return this.toTorrentAddingResult(await this.fetch(url, { method: "POST", body: payload }), TASK_ERRORS);
    }

    private async toTorrentAddingResult(response: Response, errors: Record<number, string>): Promise<TorrentAddingResult> {
        const responseText = await response.text();

        let json: { success?: boolean; error?: { code?: number } };
        try {
            json = JSON.parse(responseText);
        } catch {
            return { success: false, httpResponseCode: response.status, httpResponseBody: responseText };
        }

        if (json?.success === true) {
            return { success: true, httpResponseCode: response.status, httpResponseBody: null };
        }

        return {
            success: false,
            httpResponseCode: response.status,
            httpResponseBody: this.describeError(json?.error?.code, errors),
        };
    }

    private requireApi(apis: SynologyApiInfoMap, name: string): SynologyApiInfo {
        const info = apis[name];
        if (!info) {
            throw new Error(`${name} is not available on this Synology device`);
        }
        return info;
    }

    private resolveDestination(config: TorrentUploadConfig): string | null {
        const dir = this.getDirectory(config);
        if (!dir) {
            return null;
        }
        return dir.replace(/^\/+/, "") || null;
    }

    private describeError(code: unknown, errors: Record<number, string>): string {
        if (typeof code !== "number") {
            return "Unknown error";
        }
        return errors[code] ?? COMMON_ERRORS[code] ?? `Unknown error ${code}`;
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
