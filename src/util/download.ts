import { Torrent } from "../models/torrent";
import { getTorrentNameFromMagnetLink, getTorrentNameFromLink, parseFilesFromDecodedTorrentData, parseNameFromDecodedTorrentData, parsePrivateFlagFromDecodedTorrentData, parseTrackersFromDecodedTorrentData } from "./parsers";
import { convertBlobToString } from "./converter";
import bencode from "bencode";
import { Buffer } from "buffer";

export async function downloadTorrent(url: string): Promise<Torrent> {
    if (url.substring(0, 7) == "magnet:") {
        return Promise.resolve({ data: url, name: getTorrentNameFromMagnetLink(url), isMagnet: true });
    } else {
        let response: Response;
        try {
            response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Status not OK: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            throw new Error("Failed to fetch torrent file: " + error.message);
        }

        const torrentBlob: Blob = await response.blob();
        const torrentData: string = await convertBlobToString(torrentBlob);
        validateTorrentData(response, torrentData);
        const decodedTorrentData = bencode.decode(Buffer.from(torrentData, 'ascii'));

        return Promise.resolve({
            data: torrentBlob,
            name: parseNameFromDecodedTorrentData(decodedTorrentData) ?? getTorrentNameFromLink(url),
            isMagnet: false,
            trackers: parseTrackersFromDecodedTorrentData(decodedTorrentData),
            files: parseFilesFromDecodedTorrentData(decodedTorrentData),
            isPrivate: parsePrivateFlagFromDecodedTorrentData(decodedTorrentData),
        });
    }
}

function validateTorrentData(response: Response, data: string): void {
    if (!data || data.length < 10 || !data.startsWith("d8:announce")) {
        let contentType = response.headers.get("Content-Type");
        if (contentType) {
            const semicolonPos = contentType.indexOf(";");
            contentType = contentType.slice(0, semicolonPos).trim();
        } else {
            contentType = "unknown"
        }
        throw new Error("Received " + contentType + " content instead of a .torrent file");
    }
}