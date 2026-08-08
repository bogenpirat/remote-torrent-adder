import { type IFetchedTorrentFile } from "../models/messages";
import { bytesToBase64, MAX_TORRENT_FILE_BYTES } from "../util/torrent-bytes";

export async function fetchTorrentInPage(url: string): Promise<IFetchedTorrentFile> {
    const response = await fetch(url, {
        mode: isSameOrigin(url) ? "same-origin" : "cors",
        credentials: "include",
        redirect: "follow"
    });

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_TORRENT_FILE_BYTES) {
        throw new Error(`Response is ${bytes.byteLength} bytes, which is far too large for a torrent file.`);
    }

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("Content-Type"),
        cfMitigated: response.headers.get("cf-mitigated"),
        finalUrl: response.url || url,
        base64: bytesToBase64(bytes)
    };
}

function isSameOrigin(url: string): boolean {
    try {
        return new URL(url, location.href).origin === location.origin;
    } catch {
        return false;
    }
}
