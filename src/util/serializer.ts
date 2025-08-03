import { RTASettings } from "../models/settings";
import { SerializedTorrent, Torrent } from "../models/torrent";


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
    return new Promise(async (resolve) => {
        resolve({
            ...torrent,
            data: torrent.isMagnet ? torrent.data as string : await blobToBase64(torrent.data as Blob),
        });
    });
}

export function convertSerializedToTorrent(serialized: SerializedTorrent): Torrent {
    return {
        ...serialized,
        data: serialized.isMagnet ? serialized.data : base64ToBlob(serialized.data),
    };
}


function customReplacer(key: string, value: any): any {
    if (value instanceof RegExp) {
        return { __type: "RegExp", source: value.source, flags: value.flags };
    }
    return value;
}

function customReviver(key: string, value: any): any {
    if (value) {
        if (value.__type === "RegExp") {
            return new RegExp(value.source, value.flags);
        }
    }
    return value;
}

async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const binary = bytes.reduce((acc, b) => acc + String.fromCharCode(b), "");
    return btoa(binary);
}

function base64ToBlob(base64: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: "application/x-bittorrent" });
}
