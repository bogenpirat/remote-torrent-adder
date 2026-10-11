import { type ConnectionTestResult, type TorrentAddingResult, type WebUISettings } from "./webui";

export type Credentials = Pick<WebUISettings, "username" | "password">;

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
    return { success: false, httpResponseCode: 0, httpResponseBody: (error as Error)?.message ?? null };
}

export function toReachableResult(authenticated: boolean, httpResponseCode: number): ConnectionTestResult {
    return {
        reachable: true,
        authenticated,
        httpResponseCode,
        message: authenticated
            ? "Reachable & authenticated"
            : "Reachable, but authentication failed",
    };
}

export function toUnreachableResult(error: unknown): ConnectionTestResult {
    return {
        reachable: false,
        authenticated: null,
        httpResponseCode: error instanceof HttpError ? error.status : 0,
        message: `Could not reach server: ${(error as Error)?.message ?? error}`,
    };
}

export async function probeWithBasicAuth(url: string, credentials: Credentials): Promise<ConnectionTestResult> {
    try {
        const response = await fetch(url, { method: "GET", headers: createBasicAuthHeaders(credentials) });
        const authenticated = response.status !== 401 && response.status !== 403;
        return toReachableResult(authenticated, response.status);
    } catch (error) {
        return toUnreachableResult(error);
    }
}
