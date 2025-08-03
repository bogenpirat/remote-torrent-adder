import { Client } from './clients';
import { Torrent, TorrentUploadConfig } from './torrent';

export interface WebUISettings {
    id: string;

    client: Client;
    name: string;

    host: string;
    port: number;
    secure: boolean;
    relativePath: string | null;

    username: string;
    password: string;

    showPerTorrentConfigSelector: boolean;
    defaultLabel: string | null;
    defaultDir: string | null;
    labels: Array<string>;
    dirs: Array<string>;
    addPaused: boolean;
    autoLabelDirSettings: Array<AutoLabelDirSetting>;

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

    abstract get isLabelSupported(): boolean;
    abstract get isDirSupported(): boolean;
    abstract get isAddPausedSupported(): boolean;

    public abstract sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult>;

    createBaseUrl(): string {
        return [
            "http",
            this.settings.secure ? "s" : "",
            "://",
            this.settings.host,
            ":",
            this.settings.port,
            this.settings.relativePath ? this.addSurroundingSlashes(this.settings.relativePath) : "",
        ].join("");
    }

    createBaseUrlPatternForFilter(): string {
        return this.createBaseUrl().replace(/\/+$/, "") + "/";
    }

    protected async fetch(url: string, options?: RequestInit): Promise<Response> {
        const res: Response = await fetch(url, options);
        if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
        }
        return res;
    }

    protected addSurroundingSlashes(urlPart: string): string {
        return "/" + urlPart.replace(/^\/+|\/+$/g, "") + "/";
    }

    protected getDirectory(config: TorrentUploadConfig): string | null {
        return config.dir ?? this.settings.defaultDir ?? null;
    }

    protected getLabel(config: TorrentUploadConfig): string | null {
        return config.label ?? this.settings.defaultLabel ?? null;
    }

    protected getAddPaused(config: TorrentUploadConfig): boolean | null {
        return config.addPaused ?? this.settings.addPaused ?? false;
    }

}

export interface TorrentAddingResult {
    success: boolean;
    httpResponseCode: number;
    httpResponseBody: string | null;
}

export interface AutoLabelDirSetting {
    criteria: Array<AutoLabelDirCriterion>;
    label: string | null;
    dir: string | null;
}

export interface AutoLabelDirCriterion {
    field: "trackerUrl";
    value: string;
}