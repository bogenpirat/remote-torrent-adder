import { describe, it, expect } from "vitest";
import { initiateWebUis } from "../../src/util/webuis";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { Client } from "../../src/models/clients";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings } from "../helpers/fixtures";

describe("initiateWebUis", () => {
    it("constructs a TorrentWebUI per configured setting", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "a", client: Client.QBittorrentWebUI }),
            makeWebUISettings({ id: "b", client: Client.DelugeWebUI }),
        ];
        const webUis = await initiateWebUis(settings);
        expect(webUis).toHaveLength(2);
        expect(webUis[0]).toBeInstanceOf(QBittorrentWebUI);
    });

    it("filters out settings with an unknown client", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "a", client: Client.QBittorrentWebUI }),
            makeWebUISettings({ id: "bad", client: "unknown" as Client }),
        ];
        const webUis = await initiateWebUis(settings);
        expect(webUis).toHaveLength(1);
        expect(webUis[0].settings.id).toBe("a");
    });

    it("returns an empty array when no webuis are configured", async () => {
        expect(await initiateWebUis(getDefaultSettings())).toEqual([]);
    });
});
