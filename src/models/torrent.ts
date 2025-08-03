
export interface Torrent {
    data: Blob | string;
    name: string;
    isMagnet: boolean;
    trackers?: string[];
    files?: string[];
    isPrivate?: boolean;
}

export interface SerializedTorrent extends Torrent {
    data: string;
}

export interface TorrentUploadConfig {
    dir?: string;
    label?: string;
    addPaused?: boolean;
}
