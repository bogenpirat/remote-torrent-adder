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
    useAlternativeLabelDirChooser?: boolean;
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
    // Static per-implementation defaults. Implementations may override this.
    // Example: class RuTorrentWebUI extends TorrentWebUI { static clientSpecificDefaults = { dontAddNamePath: false } }
    static clientSpecificDefaults: Record<string, any> = {};

    constructor(settings: WebUISettings) {
        this._settings = settings;
        // Ensure the settings record exists
        this._settings.clientSpecificSettings = this._settings.clientSpecificSettings || {};
        // Apply defaults declared on the concrete implementation (if any)
        this.ensureClientSpecificDefaults();
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

    public abstract sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult>;

    createBaseUrl(): string {
        return [
            "http",
            this.settings.secure ? "s" : "",
            "://",
            this.settings.host,
            ":",
            this.settings.port ?? (this.settings.secure ? "443" : "80"),
            this.settings.relativePath ? this.addLeadingAndTrimTrailingSlashes(this.settings.relativePath) : "",
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

    protected addLeadingAndTrimTrailingSlashes(urlPart: string): string {
        if (!urlPart) {
            return "";
        }
        return "/" + urlPart.replace(/^\/+|\/+$/g, "");
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

    // Client-specific settings API
    // Get the raw stored client-specific value (if any)
    public getClientSpecific<T = any>(key: string): T | undefined {
        return this._settings.clientSpecificSettings ? this._settings.clientSpecificSettings[key] as T : undefined;
    }

    // Get stored value or fallback to implementation default (if declared)
    public getClientSpecificOrDefault<T = any>(key: string): T | undefined {
        const stored = this.getClientSpecific<T>(key);
        if (stored !== undefined) return stored;
        const ctor = this.constructor as typeof TorrentWebUI;
        return (ctor.clientSpecificDefaults ? ctor.clientSpecificDefaults[key] : undefined) as T | undefined;
    }

    // Set and persist a client-specific setting into WebUISettings.clientSpecificSettings
    public setClientSpecific<T = any>(key: string, value: T): void {
        this._settings.clientSpecificSettings = this._settings.clientSpecificSettings || {};
        this._settings.clientSpecificSettings[key] = value;
    }

    // Initialize missing keys from the concrete implementation defaults
    protected ensureClientSpecificDefaults(): void {
        const ctor = this.constructor as typeof TorrentWebUI;
        const defaults = ctor.clientSpecificDefaults || {};
        for (const k of Object.keys(defaults)) {
            if (this._settings.clientSpecificSettings[k] === undefined) {
                this._settings.clientSpecificSettings[k] = defaults[k];
            }
        }
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