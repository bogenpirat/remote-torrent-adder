import { RTASettings } from "../models/settings";
import { getDefaultSettings } from "./settings-defaults";
import { migrateSettingsClientIdentifiers } from "./legacy-client-identifiers";
import { serializeSettings, deserializeSettings } from "./serializer";


const SETTINGS_KEY: string = "settings";

export class Settings {
    private _rtaSettings!: RTASettings;

    public get settings(): RTASettings {
        return this._rtaSettings;
    }

    public set rtaSettings(settings: RTASettings) {
        this._rtaSettings = settings;
        this.saveSettings(settings);
    }

    public loadSettings(): Promise<RTASettings> {
        return new Promise((resolve) => {
            chrome.storage.local.get([SETTINGS_KEY], async (response: Record<string, string>) => {
                console.debug("Loaded serialized RTAv2 settings:", response);
                if (!response[SETTINGS_KEY]) {
                    console.log("Initializing with default settings.");
                    const defaults = getDefaultSettings();
                    await this.saveSettings(defaults);
                    resolve(defaults);
                    return;
                }
                try {
                    const loaded = deserializeSettings(response[SETTINGS_KEY]) ?? getDefaultSettings();
                    const migrated = migrateSettingsClientIdentifiers(loaded);
                    if (migrated !== loaded) {
                        await this.saveSettings(migrated);
                    }
                    resolve(migrated);
                } catch (e) {
                    console.error("Failed to deserialize settings, resetting to defaults", e);
                    const defaults = getDefaultSettings();
                    await this.saveSettings(defaults);
                    resolve(defaults);
                }
            });
        });
    }

    public saveSettings(settings: RTASettings): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [SETTINGS_KEY]: serializeSettings(settings) }, () => {
                console.log("Settings saved: ", settings);
                resolve();
            });
        });
    }

    public serialize(): string {
        return serializeSettings(this._rtaSettings);
    }

    public deserialize(serialized: string): RTASettings | null {
        return deserializeSettings(serialized);
    }

}
