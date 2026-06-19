import { describe, it, expect } from "vitest";
import {
    Client,
    ClientDisplayName,
    ClientClassByClient,
    WebUIFactory,
} from "../../src/models/clients";
import { TorrentWebUI } from "../../src/models/webui";
import { makeWebUISettings } from "../helpers/fixtures";

describe("Client metadata tables", () => {
    it("has a display name for every client", () => {
        for (const client of Object.values(Client)) {
            expect(ClientDisplayName[client]).toBeTruthy();
        }
    });

    it("has a concrete class for every client", () => {
        for (const client of Object.values(Client)) {
            expect(ClientClassByClient[client]).toBeTypeOf("function");
        }
    });
});

describe("WebUIFactory.createWebUI", () => {
    it("constructs the correct subclass for each client", () => {
        for (const client of Object.values(Client)) {
            const webUi = WebUIFactory.createWebUI(makeWebUISettings({ client }));
            expect(webUi).toBeInstanceOf(TorrentWebUI);
            expect(webUi).toBeInstanceOf(ClientClassByClient[client]);
        }
    });

    it("exposes the provided settings on the constructed instance", () => {
        const settings = makeWebUISettings({ client: Client.DelugeWebUI, name: "Home Deluge" });
        const webUi = WebUIFactory.createWebUI(settings)!;
        expect(webUi.name).toBe("Home Deluge");
        expect(webUi.client).toBe(Client.DelugeWebUI);
    });

    it("returns null for an unknown client identifier", () => {
        const settings = makeWebUISettings({ client: "nonexistent" as Client });
        expect(WebUIFactory.createWebUI(settings)).toBeNull();
    });
});
