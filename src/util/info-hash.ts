import bencode from "bencode";
import { type Torrent } from "../models/torrent";
import { decodeTorrentBytes } from "./bencode-decode";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export async function computeInfoHash(torrent: Torrent): Promise<string | null> {
    try {
        if (torrent.isMagnet) {
            return parseInfoHashFromMagnetLink(torrent.data as string);
        }
        const bytes = new Uint8Array(await (torrent.data as Blob).arrayBuffer());
        const info = bencode.encode(decodeTorrentBytes(bytes).info as never) as Uint8Array<ArrayBuffer>;
        return toHex(new Uint8Array(await crypto.subtle.digest("SHA-1", info)));
    } catch (error) {
        console.warn("Could not compute the info hash", error);
        return null;
    }
}

export function parseInfoHashFromMagnetLink(magnetLink: string): string | null {
    let exactTopics: string[];
    try {
        exactTopics = new URL(magnetLink).searchParams.getAll("xt");
    } catch {
        return null;
    }
    for (const exactTopic of exactTopics) {
        const encoded = exactTopic.match(/^urn:btih:(.+)$/i)?.[1];
        if (encoded && /^[0-9a-f]{40}$/i.test(encoded)) {
            return encoded.toLowerCase();
        }
        if (encoded && /^[A-Z2-7]{32}$/i.test(encoded)) {
            return base32ToHex(encoded.toUpperCase());
        }
    }
    return null;
}

function base32ToHex(encoded: string): string {
    let bits = "";
    for (const character of encoded) {
        bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, "0");
    }
    return (bits.match(/.{4}/g) ?? []).map(nibble => parseInt(nibble, 2).toString(16)).join("");
}

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
