import bencode from "bencode";
import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

export interface GeneratedTorrent {
    url: string;
    name: string;
    infoHash: string;
}

export function uniqueName(): string {
    return `rta-it-${randomBytes(6).toString("hex")}`;
}

export function randomMagnet(): GeneratedTorrent {
    const name = uniqueName();
    const infoHash = randomBytes(20).toString("hex");
    return {
        url: `magnet:?xt=urn:btih:${infoHash}&dn=${name}&tr=${encodeURIComponent("http://tracker.invalid/announce")}`,
        name,
        infoHash,
    };
}

export class TorrentServer {
    private server!: Server;
    private readonly files = new Map<string, Buffer>();
    port = 0;

    async start(): Promise<void> {
        this.server = createServer((req, res) => {
            const file = this.files.get((req.url ?? "/").split("?")[0] ?? "");
            if (!file) {
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200, { "Content-Type": "application/x-bittorrent" });
            res.end(file);
        });
        await new Promise<void>(resolve => this.server.listen(0, "127.0.0.1", resolve));
        this.port = (this.server.address() as AddressInfo).port;
    }

    async stop(): Promise<void> {
        this.server.closeAllConnections();
        await new Promise<void>(resolve => this.server.close(() => resolve()));
    }

    createTorrent({ multiFile = false }: { multiFile?: boolean } = {}): GeneratedTorrent {
        const name = uniqueName();
        const info = {
            name,
            "piece length": 16384,
            pieces: randomBytes(20),
            ...(multiFile
                ? { files: [{ length: 512, path: ["a.bin"] }, { length: 512, path: ["b.bin"] }] }
                : { length: 1024 }),
        };
        const infoHash = createHash("sha1").update(bencode.encode(info)).digest("hex");
        const path = `/files/${name}.torrent`;
        this.files.set(path, Buffer.from(bencode.encode({ announce: "http://tracker.invalid/announce", info })));
        return { url: `http://127.0.0.1:${this.port}${path}`, name, infoHash };
    }
}
