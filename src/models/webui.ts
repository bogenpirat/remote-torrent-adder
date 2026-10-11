import { type Client } from './clients';
import { type Torrent, type TorrentUploadConfig } from './torrent';
import { toUnreachableResult } from './webui-http';
import { buildBaseUrl } from './webui-url';

export interface WebUISettings {
    id: string;

    client: Client;
    name: string;

    host: string;
    port: number | null;
    secure: boolean;
    relativePath: string | null;

    username: string;
    password: string;

    showPerTorrentConfigSelector: boolean;
    useAlternativeLabelDirChooser?: boolean;
    defaultLabel: string | null;
    defaultDir: string | null;
    labels: Array<string>;
    dirs: Array<string>;
    addPaused: boolean;
    autoLabelDirSettings: Array<AutoLabelDirSetting>;

    clientSpecificSettings: Record<string, unknown>;
}

export interface ClientSpecificSettingDescriptor {
    key: string;
    label: string;
    type: "boolean";
    default: boolean;
    perTorrent: boolean;
    description?: string;
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

    get isLabelDirChooserSupported(): boolean {
        return this.isLabelSupported || this.isDirSupported || this.isAddPausedSupported;
    }

    get isConnectionTestSupported(): boolean {
        return true;
    }

    get clientSpecificSettingDescriptors(): ReadonlyArray<ClientSpecificSettingDescriptor> {
        return [];
    }

    public abstract sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult>;

    public async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.createBaseUrl(), { method: "GET" });
            return {
                reachable: true,
                authenticated: null,
                httpResponseCode: response.status,
                message: "Reachable (credentials not checked for this client)",
            };
        } catch (error) {
            return toUnreachableResult(error);
        }
    }

    createBaseUrl(): string {
        return buildBaseUrl(this._settings);
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

    protected getClientSpecific(key: string, config: TorrentUploadConfig): boolean {
        const descriptor = this.clientSpecificSettingDescriptors.find(candidate => candidate.key === key);
        return config.clientSpecificSettings?.[key]
            ?? (this.settings.clientSpecificSettings?.[key] as boolean | undefined)
            ?? descriptor?.default
            ?? false;
    }
}

export interface TorrentAddingResult {
    success: boolean;
    httpResponseCode: number;
    httpResponseBody: string | null;
}

export interface ConnectionTestResult {
    reachable: boolean;
    authenticated: boolean | null;
    httpResponseCode: number;
    message: string;
}

export interface AutoLabelDirSetting {
    criteria: Array<AutoLabelDirCriterion>;
    label: string | null;
    dir: string | null;
}

export interface AutoLabelDirCriterion {
    field: "trackerUrl" | "filePath" | "torrentName";
    value: string;
}