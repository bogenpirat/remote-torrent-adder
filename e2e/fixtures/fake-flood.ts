import { createServer, type IncomingMessage, type Server } from "node:http";
import { closeServer, listenOnLoopback, readBody } from "./local-server";

export interface FakeFloodOptions {
    authenticateDelayMs?: number;
}

export class FakeFlood {
    readonly requests: { path: string; body: string }[] = [];
    private server!: Server;
    private readonly authenticateDelayMs: number;
    port = 0;

    constructor(options: FakeFloodOptions = {}) {
        this.authenticateDelayMs = options.authenticateDelayMs ?? 0;
    }

    async start(): Promise<void> {
        this.server = createServer((req, res) => {
            void this.handle(req).then(path => {
                const delay = path.includes("authenticate") ? this.authenticateDelayMs : 0;
                setTimeout(() => {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true }));
                }, delay);
            });
        });
        this.port = await listenOnLoopback(this.server);
    }

    private async handle(req: IncomingMessage): Promise<string> {
        const path = (req.url ?? "").split("?")[0] ?? "";
        this.requests.push({ path, body: (await readBody(req)).toString("utf8") });
        return path;
    }

    async stop(): Promise<void> {
        await closeServer(this.server);
    }

    pathsHit(): string[] {
        return this.requests.map(request => request.path);
    }

    lastAddRequest(): { path: string; body: string } | undefined {
        return this.requests.filter(request => request.path === "/api/torrents/add-files").at(-1);
    }
}
