import { createServer, type IncomingMessage, type Server } from "node:http";
import { type AddressInfo } from "node:net";

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
        await new Promise<void>(resolve => this.server.listen(0, "127.0.0.1", resolve));
        this.port = (this.server.address() as AddressInfo).port;
    }

    private async handle(req: IncomingMessage): Promise<string> {
        const path = (req.url ?? "").split("?")[0] ?? "";
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk as Buffer);
        }
        this.requests.push({ path, body: Buffer.concat(chunks).toString("utf8") });
        return path;
    }

    async stop(): Promise<void> {
        this.server.closeAllConnections();
        await new Promise<void>(resolve => this.server.close(() => resolve()));
    }

    pathsHit(): string[] {
        return this.requests.map(request => request.path);
    }

    lastAddRequest(): { path: string; body: string } | undefined {
        return this.requests.filter(request => request.path === "/api/torrents/add-files").at(-1);
    }
}
