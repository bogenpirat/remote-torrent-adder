import { vi } from "vitest";
import { utf8Bytes } from "./fixtures";

interface MockResponseInit {
    status?: number;
    body?: string;
    json?: any;
    url?: string;
    headers?: Record<string, string>;
}

/**
 * A minimal stand-in for the Fetch `Response` that exposes only what the
 * production code reads: `ok`, `status`, `url`, `text()`, `json()`, `blob()`
 * and a `headers.get()`.
 */
export function mockResponse(init: MockResponseInit = {}): Response {
    const status = init.status ?? 200;
    return {
        ok: isSuccessStatus(status),
        status,
        statusText: "",
        url: init.url ?? "",
        headers: headerLookup(init.headers ?? {}),
        ...bodyReaders(init),
    } as unknown as Response;
}

function isSuccessStatus(status: number): boolean {
    return status >= 200 && status < 300;
}

function headerLookup(headers: Record<string, string>) {
    return {
        get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
    };
}

function bodyReaders(init: MockResponseInit) {
    const bodyText = init.json !== undefined ? JSON.stringify(init.json) : (init.body ?? "");
    return {
        text: () => Promise.resolve(bodyText),
        json: () => Promise.resolve(init.json !== undefined ? init.json : JSON.parse(bodyText || "null")),
        blob: () => Promise.resolve(new Blob([bodyText])),
        arrayBuffer: () => Promise.resolve(utf8Bytes(bodyText).buffer),
    };
}

/**
 * Installs a `fetch` stub that returns the queued responses in order. Each
 * queue entry may be a `Response` or a function receiving (url, options) for
 * per-call assertions/branching.
 */
export function queueFetch(
    ...responses: Array<Response | ((url: string, options?: RequestInit) => Response | Promise<Response>)>
): ReturnType<typeof vi.fn> {
    let call = 0;
    const fn = vi.fn((url: string, options?: RequestInit) => {
        const entry = responses[Math.min(call, responses.length - 1)];
        call++;
        if (typeof entry === "function") {
            return Promise.resolve(entry(url, options));
        }
        return Promise.resolve(entry);
    });
    (globalThis as any).fetch = fn;
    return fn;
}
