import { Client } from './clients';
import { Torrent, TorrentUploadConfig } from './torrent';

export interface WebUISettings {
    client: Client;
    name: string;

    host: string;
    port: number;
    secure: boolean;
    relativePath: string | null;

    username: string;
    password: string;

    labels: Array<string>;
    dirs: Array<string>;
    addPaused: boolean;

    clientSpecificSettings: Record<string, any>;
}

export abstract class TorrentWebUI {
    _settings: WebUISettings;

    constructor(settings: WebUISettings) {
        this._settings = settings;
    }

    get name(): string {
        return this._settings.name;
    }

    get client(): Client {
        return this._settings.client;
    }

    get settings(): WebUISettings {
        return this._settings;
    }

    protected abstract sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<void>;

    checkPerClickSettingsAndSendTorrent(torrent: Torrent): Promise<void> {
        // default implementation immediately sends the torrent, no config dialog in content script
        const config: TorrentUploadConfig = null; // TODO: fetch this somehow
        return this.sendTorrent(torrent, config);
    }
}
