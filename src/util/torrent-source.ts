import { type DecodedTorrent } from "../models/decoded-torrent";
import { type Torrent } from "../models/torrent";
import { decodeTorrentBytes } from "./bencode-decode";
import {
    getTorrentNameFromMagnetLink,
    parseFilesFromDecodedTorrentData,
    parseNameFromDecodedTorrentData,
    parsePrivateFlagFromDecodedTorrentData,
    parseTrackersFromDecodedTorrentData,
    parseTrackersFromMagnetLink
} from "./parsers";

export function buildTorrentFromMagnetLink(magnetLink: string): Torrent {
    return {
        data: magnetLink,
        name: getTorrentNameFromMagnetLink(magnetLink),
        isMagnet: true,
        trackers: parseTrackersFromMagnetLink(magnetLink)
    };
}

export function buildTorrentFromDecodedData(decodedTorrentData: DecodedTorrent, fallbackName: string, data: Blob): Torrent {
    return {
        data: data,
        name: parseNameFromDecodedTorrentData(decodedTorrentData) ?? fallbackName,
        isMagnet: false,
        trackers: parseTrackersFromDecodedTorrentData(decodedTorrentData),
        files: parseFilesFromDecodedTorrentData(decodedTorrentData),
        isPrivate: parsePrivateFlagFromDecodedTorrentData(decodedTorrentData)
    };
}

export async function parseTorrentFile(file: File): Promise<Torrent> {
    let decodedTorrentData: DecodedTorrent;
    try {
        decodedTorrentData = decodeTorrentBytes(new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
        throw new Error(`"${file.name}" doesn't look like a .torrent file.`, { cause: error });
    }

    return buildTorrentFromDecodedData(decodedTorrentData, file.name, new Blob([file]));
}
