import { describe, it, expect } from "vitest";
import { Settings } from "../../src/util/settings";
import { serializeSettings } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { Client } from "../../src/models/clients";
import { makeWebUISettings } from "../helpers/fixtures";

describe("Settings.loadSettings", () => {
    it("initializes with defaults and persists them when storage is empty", async () => {
        const settings = new Settings();
        const loaded = await settings.loadSettings();

        expect(loaded).toEqual(getDefaultSettings());
        // defaults were written back to storage
        expect((chrome as any).__storage.settings).toBeTruthy();
    });

    it("deserializes previously stored settings", async () => {
        const stored = getDefaultSettings();
        stored.notificationsDurationMs = 5000;
        (chrome as any).__storage.settings = serializeSettings(stored);

        const loaded = await new Settings().loadSettings();
        expect(loaded.notificationsDurationMs).toBe(5000);
        expect(loaded.linkCatchingRegexes[0]).toBeInstanceOf(RegExp);
    });

    it("migrates legacy client identifiers and re-persists", async () => {
        const stored = getDefaultSettings();
        stored.webuiSettings = [makeWebUISettings({ client: "qBittorrent WebUI" as Client })];
        (chrome as any).__storage.settings = serializeSettings(stored);

        const loaded = await new Settings().loadSettings();
        expect(loaded.webuiSettings[0].client).toBe(Client.QBittorrentWebUI);
        // re-persisted in migrated form
        const reloaded = await new Settings().loadSettings();
        expect(reloaded.webuiSettings[0].client).toBe(Client.QBittorrentWebUI);
    });

    it("falls back to defaults when stored data cannot be parsed", async () => {
        (chrome as any).__storage.settings = "{not valid json";
        const loaded = await new Settings().loadSettings();
        expect(loaded).toEqual(getDefaultSettings());
    });
});

describe("Settings.saveSettings", () => {
    it("serializes and stores settings under the settings key", async () => {
        const toSave = getDefaultSettings();
        toSave.notificationsSoundEnabled = true;
        await new Settings().saveSettings(toSave);

        expect(chrome.storage.local.set).toHaveBeenCalled();
        expect((chrome as any).__storage.settings).toContain("notificationsSoundEnabled");
    });
});

describe("Settings.serialize / deserialize", () => {
    it("round-trips the in-memory settings", () => {
        const settings = new Settings();
        const value = getDefaultSettings();
        value.notificationsDurationMs = 1234;
        settings.rtaSettings = value;

        const restored = settings.deserialize(settings.serialize())!;
        expect(restored.notificationsDurationMs).toBe(1234);
    });
});
