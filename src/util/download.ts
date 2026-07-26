import { Torrent } from "../models/torrent";
import { getTorrentNameFromMagnetLink, getTorrentNameFromLink, parseFilesFromDecodedTorrentData, parseNameFromDecodedTorrentData, parsePrivateFlagFromDecodedTorrentData, parseTrackersFromDecodedTorrentData } from "./parsers";
import bencode from "bencode";
import { executeMethodWrappedWithReferer } from "./cors-tricks";
import { getBaseUrl } from "./utils";

export async function downloadTorrent(url: string): Promise<Torrent> {
    if (url.startsWith("magnet:")) {
        return { data: url, name: getTorrentNameFromMagnetLink(url), isMagnet: true };
    }

    let response: Response;
    try {
        response = await executeMethodWrappedWithReferer(() => fetch(url), url, getBaseUrl(url));
    } catch (error) {
        throw new Error("Failed to fetch torrent file: " + (error as Error).message);
    }
    if (!response.ok) {
        throw new Error(`Status not OK: ${response.status} ${response.statusText}`);
    }

    const torrentBlob: Blob = await response.blob();
    const decodedTorrentData = decodeTorrentDataAndValidate(response, new Uint8Array(await torrentBlob.arrayBuffer()));

    return {
        data: torrentBlob,
        name: parseNameFromDecodedTorrentData(decodedTorrentData) ?? getTorrentNameFromLink(url),
        isMagnet: false,
        trackers: parseTrackersFromDecodedTorrentData(decodedTorrentData),
        files: parseFilesFromDecodedTorrentData(decodedTorrentData),
        isPrivate: parsePrivateFlagFromDecodedTorrentData(decodedTorrentData),
    };
}

function decodeTorrentDataAndValidate(response: Response, torrentData: Uint8Array): any {
    try {
        return bencode.decode(torrentData as any);
    } catch (error) {
        let contentType = response.headers.get("Content-Type");
        if (contentType) {
            const semicolonPos = contentType.indexOf(";");
            contentType = contentType.slice(0, semicolonPos).trim();
        } else {
            contentType = "unknown"
        }

        console.error("Invalid torrent data received", torrentData);

        throw new Error("Received " + contentType + " instead of a torrent file. Please check the devtools view for details.");
    }
}