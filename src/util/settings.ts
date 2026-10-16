import { ext } from "./browser-api";
import { type RTASettings } from "../models/settings";
import { getDefaultSettings } from "./settings-defaults";
import { migrateSettingsClientIdentifiers } from "./legacy-client-identifiers";
import { serializeSettings, deserializeSettings } from "./serializer";


export const SETTINGS_KEY: string = "settings";

export class Settings {
    public async loadSettings(): Promise<RTASettings> {
        const response = await ext.storage.local.get([SETTINGS_KEY]) as Record<string, string>;
        console.debug("Loaded serialized RTAv2 settings:", response);
        if (!response[SETTINGS_KEY]) {
            console.log("Initializing with default settings.");
            return this.saveAndReturnDefaults();
        }
        try {
            return await this.deserializeAndPersistMigration(response[SETTINGS_KEY]);
        } catch (e) {
            console.error("Failed to deserialize settings, resetting to defaults", e);
            return this.saveAndReturnDefaults();
        }
    }

    private async saveAndReturnDefaults(): Promise<RTASettings> {
        const defaults = getDefaultSettings();
        await this.saveSettings(defaults);
        return defaults;
    }

    private async deserializeAndPersistMigration(serialized: string): Promise<RTASettings> {
        const loaded = deserializeSettings(serialized);
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
}
