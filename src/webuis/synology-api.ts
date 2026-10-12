import { type Torrent } from "../models/torrent";
import { FORM_URLENCODED_HEADERS } from "../models/webui-http";

export interface SynologyApiInfo {
    path: string;
    minVersion: number;
    maxVersion: number;
}

export type SynologyApiInfoMap = Record<string, SynologyApiInfo | undefined>;

export interface SynologyApiEndpoint {
    url: string;
    maxVersion: number;
}

export interface SynologyTask {
    sessionId: string;
    torrent: Torrent;
    destination?: string;
}

export interface SynologyRequest {
    url: string;
    options?: RequestInit;
}

export const INFO_API = "SYNO.API.Info";
export const AUTH_API = "SYNO.API.Auth";
export const TASK_API = "SYNO.DownloadStation.Task";
export const TASK2_API = "SYNO.DownloadStation2.Task";

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

export const AUTH_ERRORS: Record<number, string> = {
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

export const TASK_ERRORS: Record<number, string> = {
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

export function describeError(code: unknown, errors: Record<number, string>): string {
    if (typeof code !== "number") {
        return "Unknown error";
    }
    return errors[code] ?? COMMON_ERRORS[code] ?? `Unknown error ${code}`;
}

export function createModernTaskRequest(endpoint: SynologyApiEndpoint, task: SynologyTask): SynologyRequest {
    const version = String(Math.min(endpoint.maxVersion, 2));
    return task.torrent.isMagnet
        ? createModernMagnetRequest(endpoint.url, version, task)
        : createModernFileRequest(endpoint.url, version, task);
}

function createModernMagnetRequest(url: string, version: string, task: SynologyTask): SynologyRequest {
    const params = new URLSearchParams({
        _sid: task.sessionId,
        api: TASK2_API,
        version,
        method: "create",
        type: "url",
        url: task.torrent.data as string,
        create_list: "false",
    });
    if (task.destination) {
        params.append("destination", task.destination);
    }
    return { url: `${url}?${params.toString()}` };
}

function createModernFileRequest(url: string, version: string, task: SynologyTask): SynologyRequest {
    const payload = new FormData();
    payload.append("api", TASK2_API);
    payload.append("version", version);
    payload.append("method", "create");
    payload.append("type", '"file"');
    payload.append("file", '["fileData"]');
    payload.append("create_list", "false");
    if (task.destination) {
        payload.append("destination", `"${task.destination}"`);
    }
    payload.append("fileData", createTorrentFile(task.torrent));

    const uploadUrl = `${url}?${new URLSearchParams({ _sid: task.sessionId }).toString()}`;
    return { url: uploadUrl, options: { method: "POST", body: payload } };
}

export function createLegacyTaskRequest(endpoint: SynologyApiEndpoint, task: SynologyTask): SynologyRequest {
    return task.torrent.isMagnet
        ? createLegacyMagnetRequest(endpoint, task)
        : createLegacyFileRequest(endpoint, task);
}

function createLegacyMagnetRequest(endpoint: SynologyApiEndpoint, task: SynologyTask): SynologyRequest {
    const body = new URLSearchParams({
        api: TASK_API,
        version: String(Math.min(endpoint.maxVersion, 3)),
        method: "create",
        _sid: task.sessionId,
        uri: task.torrent.data as string,
    });
    if (task.destination) {
        body.append("destination", task.destination);
    }
    return { url: endpoint.url, options: { method: "POST", headers: FORM_URLENCODED_HEADERS, body } };
}

function createLegacyFileRequest(endpoint: SynologyApiEndpoint, task: SynologyTask): SynologyRequest {
    const payload = new FormData();
    payload.append("api", TASK_API);
    payload.append("version", String(Math.min(endpoint.maxVersion, 2)));
    payload.append("method", "create");
    payload.append("_sid", task.sessionId);
    if (task.destination) {
        payload.append("destination", task.destination);
    }
    payload.append("file", createTorrentFile(task.torrent));

    return { url: endpoint.url, options: { method: "POST", body: payload } };
}

function createTorrentFile(torrent: Torrent): File {
    return new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" });
}
