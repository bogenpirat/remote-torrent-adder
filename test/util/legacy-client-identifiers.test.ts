import { describe, it, expect } from "vitest";
import {
    resolveClientIdentifier,
    migrateSettingsClientIdentifiers,
} from "../../src/util/legacy-client-identifiers";
import { Client } from "../../src/models/clients";
import { RTASettings } from "../../src/models/settings";
import { makeWebUISettings } from "../helpers/fixtures";

describe("resolveClientIdentifier", () => {
    it("returns a current identifier unchanged", () => {
        expect(resolveClientIdentifier("qbittorrent")).toBe(Client.QBittorrentWebUI);
    });

    it("maps a legacy 2.0.x identifier to the current one", () => {
        expect(resolveClientIdentifier("qBittorrent WebUI")).toBe(Client.QBittorrentWebUI);
        expect(resolveClientIdentifier("QNAP Download Station WebUI")).toBe(Client.QNAPDownloadStationWebUI);
    });

    it("returns null for an unknown identifier", () => {
        expect(resolveClientIdentifier("SomeBogusClient")).toBeNull();
    });

    it("maps every legacy identifier to a valid Client value", () => {
        const legacy = [
            "BiglyBT WebUI", "Deluge WebUI", "Elementum WebUI", "flood WebUI",
            "qBittorrent WebUI", "ruTorrent WebUI", "Tixati WebUI", "Transmission WebUI",
            "tTorrent WebUI", "Porla WebUI", "QNAP Download Station WebUI",
        ];
        const validClients = new Set(Object.values(Client));
        for (const id of legacy) {
            expect(validClients.has(resolveClientIdentifier(id)!)).toBe(true);
        }
    });
});

describe("migrateSettingsClientIdentifiers", () => {
    const settingsWithClients = (clients: string[]): RTASettings => ({
        notificationsEnabled: true,
        notificationsDurationMs: 2000,
        notificationsSoundEnabled: false,
        linkCatchingEnabled: true,
        linkCatchingRegexes: [],
        webuiSettings: clients.map((c, i) => makeWebUISettings({ id: `id-${i}`, client: c as Client })),
    });

    it("rewrites legacy identifiers and returns a new object", () => {
        const original = settingsWithClients(["qBittorrent WebUI", "Deluge WebUI"]);
        const migrated = migrateSettingsClientIdentifiers(original);
        expect(migrated).not.toBe(original);
        expect(migrated.webuiSettings[0].client).toBe(Client.QBittorrentWebUI);
        expect(migrated.webuiSettings[1].client).toBe(Client.DelugeWebUI);
    });

    it("returns the very same reference when nothing needs migrating", () => {
        const original = settingsWithClients(["qbittorrent", "deluge"]);
        expect(migrateSettingsClientIdentifiers(original)).toBe(original);
    });

    it("leaves unknown identifiers untouched", () => {
        const original = settingsWithClients(["totally-unknown"]);
        const migrated = migrateSettingsClientIdentifiers(original);
        expect(migrated).toBe(original);
        expect(migrated.webuiSettings[0].client).toBe("totally-unknown");
    });

    it("migrates only the legacy entries in a mixed list", () => {
        const original = settingsWithClients(["qbittorrent", "Deluge WebUI"]);
        const migrated = migrateSettingsClientIdentifiers(original);
        expect(migrated).not.toBe(original);
        expect(migrated.webuiSettings[0].client).toBe(Client.QBittorrentWebUI);
        expect(migrated.webuiSettings[1].client).toBe(Client.DelugeWebUI);
    });
});
