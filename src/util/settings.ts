import { RTASettings } from "../models/settings";
import { getDefaultSettings } from "./settings-defaults";
import { convertLegacySettingsToRTASettings } from "./settings-migrator-from-legacy";
import { serializeSettings, deserializeSettings } from "./serializer";


const SETTINGS_KEY: string = "settings";

export class Settings {
    private _rtaSettings: RTASettings;

    public get settings(): RTASettings {
        return this._rtaSettings;
    }

    public set rtaSettings(settings: RTASettings) {
        this._rtaSettings = settings;
        this.saveSettings(settings);
    }

    public loadSettings(): Promise<RTASettings> {
        return new Promise((resolve) => {
            chrome.storage.local.get([SETTINGS_KEY], async (response) => {
                console.log("Loaded serialized RTAv2 settings:", response);
                if (!response[SETTINGS_KEY]) {
                    const convertedLegacySettings = await convertLegacySettingsToRTASettings();
                    if (convertedLegacySettings) {
                        await this.saveSettings(convertedLegacySettings);
                    } else {
                        console.log("Initializing with default settings.");
                        await this.saveSettings(getDefaultSettings());
                    }
                    resolve(this.loadSettings())
                }
                resolve(deserializeSettings(response[SETTINGS_KEY]));
            });
        });
    }

    private saveSettings(settings: RTASettings): Promise<void> {
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

    public deserialize(serialized: string): RTASettings {
        return deserializeSettings(serialized);
    }

}
