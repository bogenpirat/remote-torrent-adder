import { type RTASettings } from "../../src/models/settings";
import { serializeSettings } from "../../src/util/serializer";

export interface SettingsStorage {
    read(): Promise<string | undefined>;
    write(serialized: string): Promise<void>;
}

/** The extension's persisted settings, reached through whichever browser hosts the extension. */
export class StoredSettings {
    constructor(private readonly storage: SettingsStorage) {}

    read(): Promise<string | undefined> {
        return this.storage.read();
    }

    async writeRaw(serialized: string): Promise<void> {
        await this.storage.write(serialized);
    }

    async seed(settings: RTASettings): Promise<void> {
        await this.writeRaw(serializeSettings(settings));
    }

    /**
     * Rewrites the stored settings with one field nudged, so the browser
     * actually fires storage.onChanged - an identical value is a no-op
     * event-wise - and the extension rebuilds the menu and the CORS rules.
     */
    async provokeChange(): Promise<void> {
        const settings = JSON.parse((await this.read()) ?? "{}") as { notificationsDurationMs?: number };
        settings.notificationsDurationMs = (settings.notificationsDurationMs ?? 2000) + 1;
        await this.writeRaw(JSON.stringify(settings));
    }
}
