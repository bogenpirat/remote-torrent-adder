import { ext } from "./browser-api";
import { type RTASettings } from "../models/settings";
import { getDefaultSettings } from "./settings-defaults";
import { migrateSettingsClientIdentifiers } from "./legacy-client-identifiers";
import { serializeSettings, deserializeSettings } from "./serializer";


export const SETTINGS_KEY: string = "settings";

export class Settings {
    private _rtaSettings!: RTASettings;

    public get settings(): RTASettings {
        return this._rtaSettings;
    }

    public set rtaSettings(settings: RTASettings) {
        this._rtaSettings = settings;
        this.saveSettings(settings);
    }

    public async loadSettings(): Promise<RTASettings> {
        const response = await ext.storage.local.get([SETTINGS_KEY]) as Record<string, string>;
        console.debug("Loaded serialized RTAv2 settings:", response);
        if (!response[SETTINGS_KEY]) {
            console.log("Initializing with default settings.");
            return this.resetToDefaults();
        }
        try {
            return await this.deserializeAndMigrate(response[SETTINGS_KEY]);
        } catch (e) {
            console.error("Failed to deserialize settings, resetting to defaults", e);
            return this.resetToDefaults();
        }
    }

    private async resetToDefaults(): Promise<RTASettings> {
        const defaults = getDefaultSettings();
        await this.saveSettings(defaults);
        return defaults;
    }

    private async deserializeAndMigrate(serialized: string): Promise<RTASettings> {
        const loaded = deserializeSettings(serialized) ?? getDefaultSettings();
        const migrated = migrateSettingsClientIdentifiers(loaded);
        if (migrated !== loaded) {
            await this.saveSettings(migrated);
        }
        return migrated;
    }

    public async saveSettings(settings: RTASettings): Promise<void> {
        await ext.storage.local.set({ [SETTINGS_KEY]: serializeSettings(settings) });
        console.log("Settings saved: ", settings);
    }

    public serialize(): string {
        return serializeSettings(this._rtaSettings);
    }

    public deserialize(serialized: string): RTASettings | null {
        return deserializeSettings(serialized);
    }

}
