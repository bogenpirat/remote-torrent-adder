import { describe, it, expect, vi } from "vitest";
import { loadPopupData, submitTorrent, type PopupData } from "../../src/popup/popup-data";
import { saveBufferedTorrent } from "../../src/util/buffered-torrent";
import { AddTorrentMessageWithLabelAndDir } from "../../src/models/messages";
import { Client } from "../../src/models/clients";
import { makeMagnetTorrent, makeWebUISettings } from "../helpers/fixtures";
import { callArgs } from "../helpers/assert";

const park = (webUiOverrides = {}, torrentOverrides = {}) =>
    saveBufferedTorrent({
        torrent: makeMagnetTorrent(torrentOverrides),
        webUiSettings: makeWebUISettings({ id: "w1", client: Client.QBittorrentWebUI, ...webUiOverrides }),
    });

async function loadParkedData(): Promise<PopupData> {
    const data = await loadPopupData();
    if (!data) {
        throw new Error("No torrent was parked before loading the popup data.");
    }
    return data;
}

describe("loadPopupData", () => {
    it("loads nothing when no torrent is waiting to be added", async () => {
        expect(await loadPopupData()).toBeUndefined();
    });

    it("exposes the parked torrent and its webui", async () => {
        await park();

        const data = await loadParkedData();
        expect(data.torrent.name).toBe("Cool Torrent");
        expect(data.webUiSettings.id).toBe("w1");
    });

    it("reports which controls the client supports", async () => {
        await park();

        const data = await loadParkedData();
        // qBittorrent supports all three
        expect(data.supports).toEqual({ label: true, directory: true, paused: true });
    });

    it("hides controls the client does not support", async () => {
        await park({ client: Client.TTorrentWebUI });

        const data = await loadParkedData();
        expect(data.supports.label).toBe(false);
        expect(data.supports.directory).toBe(false);
    });

    it("prefers the configured defaults over the first stored option", async () => {
        await park({ defaultLabel: "tv", defaultDir: "/media", labels: ["movies"], dirs: ["/other"] });

        const data = await loadParkedData();
        expect(data.initial.label).toBe("tv");
        expect(data.initial.directory).toBe("/media");
    });

    it("falls back to the first stored option when there is no default", async () => {
        await park({ defaultLabel: null, defaultDir: null, labels: ["movies", "tv"], dirs: ["/data"] });

        const data = await loadParkedData();
        expect(data.initial.label).toBe("movies");
        expect(data.initial.directory).toBe("/data");
    });

    it("leaves the fields empty when nothing is configured, rather than inventing options", async () => {
        await park({ defaultLabel: null, defaultDir: null, labels: [], dirs: [] });

        const data = await loadParkedData();
        expect(data.initial.label).toBe("");
        expect(data.initial.directory).toBe("");
        expect(data.labelOptions).toEqual([]);
    });

    it.each([
        ["a matching tracker rule", { field: "trackerUrl", value: "tracker\\.example" }, { trackers: ["http://tracker.example/announce"] }],
        // the parked magnet's name is "Cool Torrent"; the match is case-insensitive
        ["a rule matching the torrent name", { field: "torrentName", value: "cool" }, {}],
    ] as const)("applies %s and flags it as automatic", async (_title, criterion, torrentOverrides) => {
        const rule = { criteria: [criterion], label: "auto-tv", dir: "/auto" };
        await park({ defaultLabel: "manual", autoLabelDirSettings: [rule] }, torrentOverrides);

        const data = await loadParkedData();
        expect(data.initial.label).toBe("auto-tv");
        expect(data.initial.directory).toBe("/auto");
        expect(data.auto).toEqual({ label: true, directory: true });
    });

    it("does not flag values as automatic when no rule matched", async () => {
        await park(
            {
                defaultLabel: "manual",
                autoLabelDirSettings: [
                    { criteria: [{ field: "trackerUrl", value: "nope" }], label: "auto-tv", dir: null },
                ],
            },
            { trackers: ["http://tracker.example/announce"] },
        );

        const data = await loadParkedData();
        expect(data.initial.label).toBe("manual");
        expect(data.auto.label).toBe(false);
    });

    it("carries the paused default through", async () => {
        await park({ addPaused: true });
        expect((await loadParkedData()).initial.paused).toBe(true);
    });

    it("offers the client's per-torrent client-specific settings", async () => {
        await park();

        const { descriptors, initial } = (await loadParkedData()).clientSpecific;
        expect(descriptors.map(descriptor => descriptor.key)).toEqual(["forceStart"]);
        expect(initial).toEqual({ forceStart: false });
    });

    it("seeds a client-specific setting from the stored per-client value", async () => {
        await park({ clientSpecificSettings: { forceStart: true } });

        expect((await loadParkedData()).clientSpecific.initial).toEqual({ forceStart: true });
    });

    it("omits client-specific settings the client does not offer per torrent", async () => {
        await park({ client: Client.RuTorrentWebUI });

        expect((await loadParkedData()).clientSpecific.descriptors).toEqual([]);
    });

    it("offers nothing for a client that declares no client-specific settings", async () => {
        await park({ client: Client.TransmissionWebUI });

        const { descriptors, initial } = (await loadParkedData()).clientSpecific;
        expect(descriptors).toEqual([]);
        expect(initial).toEqual({});
    });
});

describe("submitTorrent", () => {
    const request = {
        webUiId: "w1",
        label: "movies",
        directory: "/data",
        paused: true,
        labelOptions: ["movies", "tv"],
        directoryOptions: ["/data"],
        clientSpecific: { forceStart: true },
    };

    it("sends the choices without the torrent, which stays in IndexedDB", async () => {
        await submitTorrent(request);

        const message = callArgs(chrome.runtime.sendMessage as any, 0)[0];
        expect(message.action).toBe(AddTorrentMessageWithLabelAndDir.action);
        expect(message.webUiId).toBe("w1");
        expect(message.config).toEqual({ label: "movies", dir: "/data", addPaused: true, clientSpecificSettings: { forceStart: true } });
        expect(message.labels).toEqual(["movies", "tv"]);
        expect(message.directories).toEqual(["/data"]);
        expect(message).not.toHaveProperty("serializedTorrent");
    });

    it("rejects when the service worker reports an error", async () => {
        (chrome.runtime.sendMessage as any).mockResolvedValue({ error: "No buffered torrent" });

        await expect(submitTorrent(request)).rejects.toThrow("No buffered torrent");
    });

    it("resolves when the service worker acknowledges", async () => {
        (chrome.runtime.sendMessage as any).mockResolvedValue({});

        await expect(submitTorrent(request)).resolves.toBeUndefined();
    });

    it("propagates a transport failure", async () => {
        (chrome.runtime.sendMessage as any).mockRejectedValue(new Error("port closed"));

        await expect(submitTorrent(request)).rejects.toThrow("port closed");
    });
});

// Guards the contract the service worker relies on: it looks the torrent up
// itself, so the popup must never be the one carrying the bytes.
describe("message payload", () => {
    it("never serializes torrent data into the message", async () => {
        vi.clearAllMocks();
        await park();
        await submitTorrent({
            webUiId: "w1",
            label: "",
            directory: "",
            paused: false,
            labelOptions: [],
            directoryOptions: [],
            clientSpecific: {},
        });

        const serialized = JSON.stringify(callArgs(chrome.runtime.sendMessage as any, 0)[0]);
        expect(serialized).not.toContain("magnet:");
    });
});
