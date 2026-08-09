import { createServer, type IncomingMessage, type Server } from "node:http";
import { type AddressInfo } from "node:net";

export interface RecordedRequest {
    method: string;
    path: string;
    fields: Record<string, string>;
    files: Record<string, { filename: string; size: number }>;
}

export interface FakeQBittorrentOptions {
    /** What `/api/v2/torrents/add` answers with. */
    addResponse?: "Ok." | "Fails.";
    addStatus?: number;
    loginStatus?: number;
}

export class FakeQBittorrent {
    readonly requests: RecordedRequest[] = [];
    private server!: Server;
    private options: Required<FakeQBittorrentOptions>;
    port = 0;

    constructor(options: FakeQBittorrentOptions = {}) {
        this.options = {
            addResponse: options.addResponse ?? "Ok.",
            addStatus: options.addStatus ?? 200,
            loginStatus: options.loginStatus ?? 200,
        };
    }

    async start(): Promise<void> {
        this.server = createServer((req, res) => {
            void this.handle(req).then(([status, body]) => {
                res.writeHead(status, {
                    "Content-Type": "text/plain",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(body);
            });
        });
        await new Promise<void>(resolve => this.server.listen(0, "127.0.0.1", resolve));
        this.port = (this.server.address() as AddressInfo).port;
    }

    async stop(): Promise<void> {
        this.server.closeAllConnections();
        await new Promise<void>(resolve => this.server.close(() => resolve()));
    }

    get baseUrl(): string {
        return `http://127.0.0.1:${this.port}`;
    }

    pathsHit(): string[] {
        return this.requests.map(request => request.path);
    }

    lastAddRequest(): RecordedRequest | undefined {
        return this.requests.filter(request => request.path === "/api/v2/torrents/add").at(-1);
    }

    private async handle(req: IncomingMessage): Promise<[number, string]> {
        const path = (req.url ?? "").split("?")[0] ?? "";
        const body = await readBody(req);
        const recorded: RecordedRequest = { method: req.method ?? "GET", path, fields: {}, files: {} };

        const contentType = req.headers["content-type"] ?? "";
        if (contentType.includes("multipart/form-data")) {
            parseMultipart(body, contentType, recorded);
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
            for (const [key, value] of new URLSearchParams(body.toString("utf8"))) {
                recorded.fields[key] = value;
            }
        }
        this.requests.push(recorded);

        if (path === "/api/v2/auth/login") {
            return this.options.loginStatus === 200 ? [200, "Ok."] : [this.options.loginStatus, "Fails."];
        }
        if (path === "/api/v2/torrents/add") {
            return [this.options.addStatus, this.options.addResponse];
        }
        return [404, "Not Found"];
    }
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
}

function parseMultipart(body: Buffer, contentType: string, into: RecordedRequest): void {
    const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
    if (!boundaryMatch) {
        return;
    }
    const boundary = `--${boundaryMatch[1] ?? boundaryMatch[2]}`;

    for (const part of body.toString("binary").split(boundary)) {
        const separator = part.indexOf("\r\n\r\n");
        if (separator === -1) {
            continue;
        }
        const headers = part.slice(0, separator);
        const name = /name="([^"]*)"/.exec(headers)?.[1];
        if (name === undefined) {
            continue;
        }
        const value = part.slice(separator + 4).replace(/\r\n$/, "");
        const filename = /filename="([^"]*)"/.exec(headers)?.[1];
        if (filename !== undefined) {
            into.files[name] = { filename, size: Buffer.from(value, "binary").length };
        } else {
            into.fields[name] = Buffer.from(value, "binary").toString("utf8");
        }
    }
}
