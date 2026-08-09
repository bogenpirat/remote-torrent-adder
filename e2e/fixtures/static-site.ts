import bencode from "bencode";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

export const TORRENT_NAME = "sample";

export function buildTorrentFile(): Buffer {
    return Buffer.from(
        bencode.encode({
            announce: "http://tracker.invalid/announce",
            info: {
                name: TORRENT_NAME,
                "piece length": 16384,
                pieces: Buffer.alloc(20, 1),
                length: 1024,
            },
        }),
    );
}

const PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>RTA e2e fixture</title></head>
<body>
  <h1>RTA e2e fixture</h1>
  <a id="torrent-link" href="/files/sample.torrent">sample.torrent</a>
  <a id="plain-link" href="/files/readme.txt">readme.txt</a>
  <a id="magnet-link" href="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=sample">magnet</a>
</body>
</html>`;

export class StaticSite {
    private server!: Server;
    port = 0;

    async start(): Promise<void> {
        const torrent = buildTorrentFile();
        this.server = createServer((req, res) => {
            const path = (req.url ?? "/").split("?")[0];
            if (path === "/files/sample.torrent") {
                res.writeHead(200, { "Content-Type": "application/x-bittorrent" });
                res.end(torrent);
                return;
            }
            if (path === "/files/readme.txt") {
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("nothing to see here");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(PAGE);
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
}
