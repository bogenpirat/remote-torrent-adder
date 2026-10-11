import { type Torrent, type TorrentUploadConfig } from "../models/torrent";
import { type ConnectionTestResult, type TorrentAddingResult, TorrentWebUI } from "../models/webui";
import {
    AUTH_API,
    AUTH_ERRORS,
    INFO_API,
    TASK2_API,
    TASK_API,
    TASK_ERRORS,
    createLegacyTaskRequest,
    createModernTaskRequest,
    describeError,
    type SynologyApiEndpoint,
    type SynologyApiInfo,
    type SynologyApiInfoMap,
    type SynologyRequest,
    type SynologyTask,
} from "./synology-api";

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

            return this.toLoginRejectedResult(json?.error?.code, response.status);
        } catch (error) {
            return this.toUnreachableResult(error);
        }
    }

    private toLoginRejectedResult(errorCode: unknown, httpResponseCode: number): ConnectionTestResult {
        return {
            reachable: true,
            authenticated: false,
            httpResponseCode,
            message: `Reachable, but authentication failed: ${describeError(errorCode, AUTH_ERRORS)}`,
        };
    }

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            const apis = await this.discoverApis();
            const sessionId = await this.login(apis);

            const request = this.createTaskRequest(apis, { sessionId, torrent, destination: this.resolveDestination(config) });
            return await this.toTorrentAddingResult(await this.fetch(request.url, request.options), TASK_ERRORS);
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
            throw new Error(`Could not query the Synology API list: ${describeError(json?.error?.code, {})}`);
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
            throw new Error(`Authentication failed: ${describeError(json?.error?.code, AUTH_ERRORS)}`);
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

    private createTaskRequest(apis: SynologyApiInfoMap, task: SynologyTask): SynologyRequest {
        const modernApi = apis[TASK2_API];
        if (modernApi) {
            return createModernTaskRequest(this.toEndpoint(modernApi), task);
        }
        return createLegacyTaskRequest(this.toEndpoint(this.requireApi(apis, TASK_API)), task);
    }

    private toEndpoint(info: SynologyApiInfo): SynologyApiEndpoint {
        return { url: `${this.createBaseUrl()}/webapi/${info.path}`, maxVersion: info.maxVersion };
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
            httpResponseBody: describeError(json?.error?.code, errors),
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
