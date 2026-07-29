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

export function parseTrackersFromMagnetLink(magnetLink: string): string[] {
    let trackers: string[];
    try {
        trackers = new URL(magnetLink).searchParams.getAll("tr");
    } catch {
        return [];
    }
    return Array.from(new Set(trackers.filter(tracker => tracker.length > 0)));
}

export function parseTrackersFromDecodedTorrentData(data: any): string[] {
    const trackers = new Set<string>();
    if ("announce" in data) {
        trackers.add(new TextDecoder().decode(data["announce"]));
    }
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
    if (!data || !("info" in data)) {
        return [];
    }
    if (!Array.isArray(data["info"]["files"])) {
        const name = parseNameFromDecodedTorrentData(data);
        return name ? [name] : [];
    }
    const decoder = new TextDecoder();
    return data["info"]["files"].map((file: any) =>
        (Array.isArray(file?.["path"]) ? file["path"] : [])
            .map((segment: any) => decoder.decode(segment))
            .join("/"));
}

export function parsePrivateFlagFromDecodedTorrentData(data: any): boolean {
    if (data && "info" in data && "private" in data["info"]) {
        return data["info"]["private"] === 1;
    }
    return false;
}
