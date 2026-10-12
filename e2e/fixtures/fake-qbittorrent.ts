import { createServer, type IncomingMessage, type Server } from "node:http";
import { closeServer, listenOnLoopback, readBody } from "./local-server";

const TLS_HANDSHAKE_RECORD = 0x16;
const PART_HEADER_END = "\r\n\r\n";

export interface RecordedRequest {
    method: string;
    path: string;
    headers: Record<string, string>;
    fields: Record<string, string>;
    files: Record<string, { filename: string; size: number }>;
}

type RecordedBody = Pick<RecordedRequest, "fields" | "files">;

export interface FakeQBittorrentOptions {
    /** What `/api/v2/torrents/add` answers with. */
    addResponse?: "Ok." | "Fails.";
    addStatus?: number;
    loginStatus?: number;
}

export class FakeQBittorrent {
    readonly requests: RecordedRequest[] = [];
    tlsHandshakes = 0;
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
                res.writeHead(status, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
                res.end(body);
            });
        });
        onTlsHandshake(this.server, () => this.tlsHandshakes++);
        this.port = await listenOnLoopback(this.server);
    }

    async stop(): Promise<void> {
        await closeServer(this.server);
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
        const recorded = await recordRequest(req);
        this.requests.push(recorded);
        return this.respondTo(recorded.path);
    }

    private respondTo(path: string): [number, string] {
        if (path === "/api/v2/auth/login") {
            return this.options.loginStatus === 200 ? [200, "Ok."] : [this.options.loginStatus, "Fails."];
        }
        if (path === "/api/v2/torrents/add") {
            return [this.options.addStatus, this.options.addResponse];
        }
        return [404, "Not Found"];
    }
}

/** A client that speaks TLS to this plain-http server shows up as a handshake record in the first bytes. */
function onTlsHandshake(server: Server, notify: () => void): void {
    server.on("connection", socket => {
        socket.once("data", chunk => {
            if (chunk[0] === TLS_HANDSHAKE_RECORD) {
                notify();
            }
        });
    });
}

async function recordRequest(req: IncomingMessage): Promise<RecordedRequest> {
    const contentType = req.headers["content-type"] ?? "";
    return {
        method: req.method ?? "GET",
        path: (req.url ?? "").split("?")[0] ?? "",
        headers: flattenHeaders(req.headers),
        ...parseBody(await readBody(req), contentType),
    };
}

function flattenHeaders(headers: IncomingMessage["headers"]): Record<string, string> {
    const flattened = Object.entries(headers).map(([name, value]) => {
        return [name.toLowerCase(), Array.isArray(value) ? value.join(", ") : String(value ?? "")];
    });
    return Object.fromEntries(flattened);
}

function parseBody(body: Buffer, contentType: string): RecordedBody {
    if (contentType.includes("multipart/form-data")) {
        return parseMultipart(body, contentType);
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
        return { fields: Object.fromEntries(new URLSearchParams(body.toString("utf8"))), files: {} };
    }
    return { fields: {}, files: {} };
}

function parseMultipart(body: Buffer, contentType: string): RecordedBody {
    const parsed: RecordedBody = { fields: {}, files: {} };
    const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
    if (!boundaryMatch) {
        return parsed;
    }
    const boundary = `--${boundaryMatch[1] ?? boundaryMatch[2]}`;
    for (const part of body.toString("binary").split(boundary)) {
        Object.assign(parsed.fields, parsePart(part).fields);
        Object.assign(parsed.files, parsePart(part).files);
    }
    return parsed;
}

function parsePart(part: string): RecordedBody {
    const [headers, ...content] = part.split(PART_HEADER_END);
    const name = /name="([^"]*)"/.exec(headers ?? "")?.[1];
    if (name === undefined || content.length === 0) {
        return { fields: {}, files: {} };
    }
    const value = Buffer.from(content.join(PART_HEADER_END).replace(/\r\n$/, ""), "binary");
    const filename = /filename="([^"]*)"/.exec(headers ?? "")?.[1];
    return filename === undefined
        ? { fields: { [name]: value.toString("utf8") }, files: {} }
        : { fields: {}, files: { [name]: { filename, size: value.length } } };
}
