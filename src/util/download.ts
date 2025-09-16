import { Torrent } from "../models/torrent";
import { getTorrentNameFromMagnetLink, getTorrentNameFromLink, parseFilesFromDecodedTorrentData, parseNameFromDecodedTorrentData, parsePrivateFlagFromDecodedTorrentData, parseTrackersFromDecodedTorrentData } from "./parsers";
import { convertBlobToString } from "./converter";
import bencode from "bencode";
import { Buffer } from "buffer";
import { executeMethodWrappedWithReferer } from "./cors-tricks";
import { getBaseUrl } from "./utils";

export async function downloadTorrent(url: string): Promise<Torrent> {
    return new Promise<Torrent>(async (resolve, reject) => {
        if (url.substring(0, 7) == "magnet:") {
            resolve({ data: url, name: getTorrentNameFromMagnetLink(url), isMagnet: true });
        } else {
            let response: Response;
            try {
                response = await executeMethodWrappedWithReferer(() => fetch(url), url, getBaseUrl(url));
                if (!response.ok) {
                    reject(new Error(`Status not OK: ${response.status} ${response.statusText}`));
                }
            } catch (error) {
                reject(new Error("Failed to fetch torrent file: " + error.message));
            }

            const torrentBlob: Blob = await response.blob();
            const torrentData: string = await convertBlobToString(torrentBlob);
            let decodedTorrentData: any;
            try {
                decodedTorrentData = decodeTorrentDataAndValidate(response, torrentData);
            } catch (error) {
                reject(error);
                return;
            };

            resolve({
                data: torrentBlob,
                name: parseNameFromDecodedTorrentData(decodedTorrentData) ?? getTorrentNameFromLink(url),
                isMagnet: false,
                trackers: parseTrackersFromDecodedTorrentData(decodedTorrentData),
                files: parseFilesFromDecodedTorrentData(decodedTorrentData),
                isPrivate: parsePrivateFlagFromDecodedTorrentData(decodedTorrentData),
            });
        }
    });
}

function decodeTorrentDataAndValidate(response: Response, torrentData: string): any {
    try {
        return bencode.decode(Buffer.from(torrentData, 'ascii'));
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