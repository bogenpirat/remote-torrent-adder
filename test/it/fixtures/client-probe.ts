import { type Client } from "../../../src/models/clients";

export interface TorrentState {
    label: string | null;
    dir: string | null;
    paused: boolean;
    raw: Record<string, unknown>;
}

export interface ClientProbe {
    profile: string;
    client: Client;
    port: number;
    relativePath?: string;
    username: string;
    password: string;
    label: string;
    dir: string;
    addsUnresolvedMagnets?: boolean;
    requiresAuth?: boolean;
    prepare(): Promise<void>;
    find(infoHash: string): Promise<TorrentState | null>;
}

export function trimTrailingSlash(path: string | null | undefined): string | null {
    if (path === null || path === undefined) {
        return null;
    }
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function basicAuth(username: string, password: string): Record<string, string> {
    return { Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64") };
}

export function cookiesFrom(response: Response): string {
    return response.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ");
}
