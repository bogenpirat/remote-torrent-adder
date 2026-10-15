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
import { FORM_URLENCODED_HEADERS, fetchOrThrow, toAuthenticatedResult, toFailureResult, toRejectedResult, toUnreachableResult } from "../models/webui-http";

// DSM 7 reports auth API v7 or later; the login is sent as v6 there and as v2 on older DSM.
const DSM7_AUTH_MIN_VERSION = 7;
const DSM7_AUTH_VERSION = 6;
const LEGACY_AUTH_VERSION = 2;

export class SynologyDownloadStationWebUI extends TorrentWebUI {
    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const apis = await this.discoverApis();
            const response = await fetch(this.createLoginUrl(apis), this.createLoginFetchOptions(apis));
            if (!response.ok) {
                return toRejectedResult(response.status);
            }

            const json = await response.json();
            if (json?.success === true && json?.data?.sid) {
                return toAuthenticatedResult(response.status);
            }

            return this.toLoginRejectedResult(json?.error?.code, response.status);
        } catch (error) {
            return toUnreachableResult(error);
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
            return await this.toTorrentAddingResult(await fetchOrThrow(request.url, request.options));
        } catch (error) {
            return toFailureResult(error);
        }
    }

    private async discoverApis(): Promise<SynologyApiInfoMap> {
        const params = new URLSearchParams({
            api: INFO_API,
            version: "1",
            method: "query",
            query: [AUTH_API, TASK_API, TASK2_API].join(","),
        });
        const response = await fetchOrThrow(`${this.createBaseUrl()}/webapi/query.cgi?${params.toString()}`);
        const json = await response.json();

        if (json?.success !== true || !json?.data) {
            throw new Error(`Could not query the Synology API list: ${describeError(json?.error?.code, {})}`);
        }

        return json.data as SynologyApiInfoMap;
    }

    private async login(apis: SynologyApiInfoMap): Promise<string> {
        const response = await fetchOrThrow(this.createLoginUrl(apis), this.createLoginFetchOptions(apis));
        const json = await response.json();

        if (json?.success !== true || !json?.data?.sid) {
            throw new Error(`Authentication failed: ${describeError(json?.error?.code, AUTH_ERRORS)}`);
        }

        return json.data.sid as string;
    }

    private createLoginUrl(apis: SynologyApiInfoMap): string {
        return `${this.createBaseUrl()}/webapi/${this.requireApi(apis, AUTH_API).path}`;
    }

    private createLoginFetchOptions(apis: SynologyApiInfoMap): RequestInit {
        const info = this.requireApi(apis, AUTH_API);
        return {
            method: "POST",
            headers: FORM_URLENCODED_HEADERS,
            body: new URLSearchParams({
                api: AUTH_API,
                version: String(info.maxVersion >= DSM7_AUTH_MIN_VERSION ? DSM7_AUTH_VERSION : LEGACY_AUTH_VERSION),
                method: "login",
                account: this.settings.username,
                passwd: this.settings.password,
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

    private async toTorrentAddingResult(response: Response): Promise<TorrentAddingResult> {
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
            httpResponseBody: describeError(json?.error?.code, TASK_ERRORS),
        };
    }

    private requireApi(apis: SynologyApiInfoMap, name: string): SynologyApiInfo {
        const info = apis[name];
        if (!info) {
            throw new Error(`${name} is not available on this Synology device`);
        }
        return info;
    }

    private resolveDestination(config: TorrentUploadConfig): string | undefined {
        return this.getDirectory(config)?.replace(/^\/+/, "") || undefined;
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
