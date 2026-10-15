import { messageOf } from "./error-message";
import { type ConnectionTestResult, type TorrentAddingResult, type WebUISettings } from "./webui";

export type Credentials = Pick<WebUISettings, "username" | "password">;

export const FORM_URLENCODED_HEADERS = { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" };

export function createJsonPostOptions(payload: unknown, extraHeaders: Record<string, string> = {}): RequestInit {
    return {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8", ...extraHeaders },
        body: JSON.stringify(payload)
    };
}

export class HttpError extends Error {
    constructor(public readonly status: number, public readonly body: string) {
        super(`HTTP error ${status}`);
        this.name = "HttpError";
    }
}

export async function fetchOrThrow(url: string, options?: RequestInit): Promise<Response> {
    const res: Response = await fetch(url, options);
    if (!res.ok) {
        throw new HttpError(res.status, await res.text().catch(() => ""));
    }
    return res;
}

export function createBasicAuthHeaders(credentials: Credentials): Record<string, string> {
    if (credentials.username || credentials.password) {
        return { "Authorization": "Basic " + btoa(`${credentials.username}:${credentials.password}`) };
    }
    return {};
}

export function toFailureResult(error: unknown): TorrentAddingResult {
    if (error instanceof HttpError) {
        return { success: false, httpResponseCode: error.status, httpResponseBody: error.body };
    }
    return { success: false, httpResponseCode: 0, httpResponseBody: messageOf(error) };
}

export function toAuthenticatedResult(httpResponseCode: number): ConnectionTestResult {
    return { reachable: true, authenticated: true, httpResponseCode, message: "Reachable & authenticated" };
}

export function toRejectedResult(httpResponseCode: number): ConnectionTestResult {
    return { reachable: true, authenticated: false, httpResponseCode, message: "Reachable, but authentication failed" };
}

export function toUnreachableResult(error: unknown): ConnectionTestResult {
    return {
        reachable: false,
        authenticated: null,
        httpResponseCode: error instanceof HttpError ? error.status : 0,
        message: `Could not reach server: ${messageOf(error)}`,
    };
}

export async function probeWithBasicAuth(url: string, credentials: Credentials): Promise<ConnectionTestResult> {
    try {
        const response = await fetch(url, { method: "GET", headers: createBasicAuthHeaders(credentials) });
        const isRejected = response.status === 401 || response.status === 403;
        return isRejected ? toRejectedResult(response.status) : toAuthenticatedResult(response.status);
    } catch (error) {
        return toUnreachableResult(error);
    }
}
