import bencode from "bencode";
import { Buffer } from "buffer";
import { Client } from "../../src/models/clients";
import { Torrent } from "../../src/models/torrent";
import { WebUISettings } from "../../src/models/webui";

/**
 * Produces a WebUISettings object with sensible defaults that individual tests
 * can selectively override.
 */
export function makeWebUISettings(overrides: Partial<WebUISettings> = {}): WebUISettings {
    return {
        id: "webui-1",
        client: Client.QBittorrentWebUI,
        name: "My Client",
        host: "example.com",
        port: 8080,
        secure: false,
        relativePath: null,
        username: "user",
        password: "pass",
        showPerTorrentConfigSelector: false,
        defaultLabel: null,
        defaultDir: null,
        labels: [],
        dirs: [],
        addPaused: false,
        autoLabelDirSettings: [],
        clientSpecificSettings: {},
        ...overrides,
    };
}

export function makeMagnetTorrent(overrides: Partial<Torrent> = {}): Torrent {
    return {
        data: "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent",
        name: "Cool Torrent",
        isMagnet: true,
        ...overrides,
    };
}

export function makeFileTorrent(overrides: Partial<Torrent> = {}): Torrent {
    return {
        data: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "application/x-bittorrent" }),
        name: "file.torrent",
        isMagnet: false,
        ...overrides,
    };
}

/**
 * Builds a real bencoded .torrent payload as an ascii string, matching what
 * `downloadTorrent` decodes after reading the response body.
 */
export function buildBencodedTorrent(data: Record<string, unknown>): string {
    const encoded = bencode.encode(data);
    return Buffer.from(encoded).toString("ascii");
}
