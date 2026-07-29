import { type RTASettings } from "../models/settings";
import { type SerializedTorrent, type Torrent } from "../models/torrent";


export function serializeSettings(settings: RTASettings): string {
    return serializeObject(settings);
}

export function deserializeSettings(serialized: string): RTASettings | null {
    return deserializeObject(serialized);
}

export function serializeObject(obj: any): string {
    return JSON.stringify(obj, customReplacer);
}

export function deserializeObject(serialized: string): any {
    if (!serialized) {
        return null;
    }
    return JSON.parse(serialized, customReviver);
}

export async function convertTorrentToSerialized(torrent: Torrent): Promise<SerializedTorrent> {
    return {
        ...torrent,
        data: torrent.isMagnet ? torrent.data as string : await blobToBase64(torrent.data as Blob),
    };
}

export function convertSerializedToTorrent(serialized: SerializedTorrent): Torrent {
    return {
        ...serialized,
        data: serialized.isMagnet ? serialized.data : base64ToBlob(serialized.data),
    };
}


function customReplacer(_key: string, value: any): any {
    if (value instanceof RegExp) {
        return { __type: "RegExp", source: value.source, flags: value.flags };
    }
    return value;
}

function customReviver(_key: string, value: any): any {
    if (value) {
        if (value.__type === "RegExp") {
            return new RegExp(value.source, value.flags);
        }
    }
    return value;
}

// Chunk small enough to stay well inside the argument limit of a spread call.
const BASE64_CHUNK_SIZE = 0x8000;

async function blobToBase64(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());

    if (typeof bytes.toBase64 === "function") {
        return bytes.toBase64();
    }

    // The previous `reduce` built the binary string one character at a time,
    // which is quadratic and got painful on large multi-file torrents.
    const chunks: string[] = [];
    for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
        chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE)));
    }
    return btoa(chunks.join(""));
}

function base64ToBlob(base64: string): Blob {
    return new Blob([base64ToBytes(base64)], { type: "application/x-bittorrent" });
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    if (typeof Uint8Array.fromBase64 === "function") {
        return Uint8Array.fromBase64(base64);
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
