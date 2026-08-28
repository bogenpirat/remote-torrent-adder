import {
    type DecodedTorrent,
    isBencodeDictionary,
    toInfo,
    toInteger,
    toList,
    toText,
} from "../models/decoded-torrent";

const FALLBACK_TORRENT_NAME = "file.torrent";
const FALLBACK_MAGNET_NAME = "Some magnet link you clicked there, buddy.";

export function getDeclaredTorrentNameFromMagnetLink(magnetLink: string): string | null {
    try {
        return new URL(magnetLink).searchParams.get("dn") || null;
    } catch {
        return null;
    }
}

export function getTorrentNameFromMagnetLink(magnetLink: string): string {
    return getDeclaredTorrentNameFromMagnetLink(magnetLink) ?? FALLBACK_MAGNET_NAME;
}

export function getTorrentNameFromLink(url: string): string {
    return url.match(/\/([^/]+\.torrent)$/)?.[1] ?? FALLBACK_TORRENT_NAME;
}

export function parseTrackersFromMagnetLink(magnetLink: string): string[] {
    let trackers: string[];
    try {
        trackers = new URL(magnetLink).searchParams.getAll("tr");
    } catch {
        return [];
    }
    return Array.from(new Set(trackers.filter(tracker => tracker.length > 0)));
}

export function parseTrackersFromDecodedTorrentData(data: DecodedTorrent | null | undefined): string[] {
    const trackers = new Set<string>();

    const announce = toText(data?.announce);
    if (announce !== null) {
        trackers.add(announce);
    }

    toList(data?.["announce-list"]).forEach(tier => {
        toList(tier).forEach(tracker => {
            const url = toText(tracker);
            if (url !== null) {
                trackers.add(url);
            }
        });
    });

    return Array.from(trackers);
}

export function parseNameFromDecodedTorrentData(data: DecodedTorrent | null | undefined): string | null {
    return toText(toInfo(data)?.name) || null;
}

export function parseFilesFromDecodedTorrentData(data: DecodedTorrent | null | undefined): string[] {
    const info = toInfo(data);
    if (!info) {
        return [];
    }

    if (!Array.isArray(info.files)) {
        const name = parseNameFromDecodedTorrentData(data);
        return name ? [name] : [];
    }

    return info.files.map(file => toList(isBencodeDictionary(file) ? file["path"] : undefined)
        .map(segment => toText(segment))
        .filter((segment): segment is string => segment !== null)
        .join("/"));
}

export function parsePrivateFlagFromDecodedTorrentData(data: DecodedTorrent | null | undefined): boolean {
    return toInteger(toInfo(data)?.private) === 1;
}
