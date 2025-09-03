const FALLBACK_TORRENT_NAME = "file.torrent";

export function getTorrentNameFromMagnetLink(magnetLink: string): string {
    const nameMatch = magnetLink.match(/dn=([^&]+)/);
    return nameMatch ? decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ') : "Some magnet link you clicked there, buddy.";
}

export function getTorrentNameFromLink(url: string): string {
    const match = url.match(/\/([^\/]+.torrent)$/);
    if (match) {
        return match[1];
    }
    return FALLBACK_TORRENT_NAME;
}

export function parseTrackersFromDecodedTorrentData(data: any): string[] {
    const trackers = new Set<string>();
    trackers.add(new TextDecoder().decode(data["announce"]));
    if ("announce-list" in data && data["announce-list"].length > 0) {
        data["announce-list"].forEach((announceList: any[]) => {
            if (Array.isArray(announceList)) {
                announceList.forEach((tracker) => {
                    trackers.add(new TextDecoder().decode(tracker));
                });
            }
        });
    }
    return Array.from(trackers);
}

export function parseNameFromDecodedTorrentData(data: any): string | null {
    if (data && data["info"] && data["info"]["name"]) {
        return new TextDecoder().decode(data["info"]["name"]);
    }
    return null;
}

export function parseFilesFromDecodedTorrentData(data: any): string[] {
    const files: Array<string> = [];
    if ("info" in data && "files" in data["info"]) {
        data["info"]["files"].forEach((file: any) => {
            var thisFilePath = file["path"];
            files.push(new TextDecoder().decode(thisFilePath[thisFilePath.length - 1]));
        });
    }
    return files;
}

export function parsePrivateFlagFromDecodedTorrentData(data: any): boolean {
    if (data && "info" in data && "private" in data["info"]) {
        return data["info"]["private"] === 1;
    }
    return false;
}
