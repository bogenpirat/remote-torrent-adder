
export interface Torrent {
    data: Uint8Array | string;
    name: string;
    isMagnet: boolean;
    trackers?: string[];
    files?: string[];
    isPrivate?: boolean;
}

export interface TorrentUploadConfig {
    dir?: string;
    label?: string;
    addPaused?: boolean;
}