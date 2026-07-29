import bencode from "bencode";
import { Torrent } from "../models/torrent";
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

export function buildTorrentFromDecodedData(decodedTorrentData: any, fallbackName: string, data: Blob): Torrent {
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
    let decodedTorrentData: any;
    try {
        decodedTorrentData = bencode.decode(new Uint8Array(await file.arrayBuffer()) as any);
    } catch {
        throw new Error(`"${file.name}" doesn't look like a .torrent file.`);
    }

    if (!decodedTorrentData || typeof decodedTorrentData !== "object" || !("info" in decodedTorrentData)) {
        throw new Error(`"${file.name}" doesn't look like a .torrent file.`);
    }

    return buildTorrentFromDecodedData(decodedTorrentData, file.name, new Blob([file]));
}
