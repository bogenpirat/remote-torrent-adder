import { describe, it, expect } from "vitest";
import { callArgs } from "../helpers/assert";
import { BiglyBTWebUI } from "../../src/webuis/biglybt-webui";
import { RqbitWebUI } from "../../src/webuis/rqbit-webui";
import { RuTorrentWebUI } from "../../src/webuis/rutorrent-webui";
import { TixatiWebUI } from "../../src/webuis/tixati-webui";
import { TransmissionWebUI } from "../../src/webuis/transmission-webui";
import { makeWebUISettings } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const settings = makeWebUISettings({ host: "h", port: 9000, username: "u", password: "p" });

const CLIENTS = [
    { name: "BiglyBT", webUi: new BiglyBTWebUI(settings), probedUrl: "http://h:9000/transmission/rpc" },
    { name: "rqbit", webUi: new RqbitWebUI(settings), probedUrl: "http://h:9000/torrents" },
    { name: "ruTorrent", webUi: new RuTorrentWebUI(settings), probedUrl: "http://h:9000/" },
    { name: "Tixati", webUi: new TixatiWebUI(settings), probedUrl: "http://h:9000/home" },
    { name: "Transmission", webUi: new TransmissionWebUI(settings), probedUrl: "http://h:9000/transmission/rpc" },
];

describe.each(CLIENTS)("$name testConnection", ({ webUi, probedUrl }) => {
    it("probes its own endpoint with the basic auth credentials", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }));

        await expect(webUi.testConnection()).resolves.toMatchObject({ reachable: true, authenticated: true });
        expect(callArgs(fetch, 0)).toEqual([probedUrl, { method: "GET", headers: { Authorization: "Basic " + btoa("u:p") } }]);
    });

    it("reports rejected credentials", async () => {
        queueFetch(mockResponse({ status: 401 }));

        await expect(webUi.testConnection()).resolves.toMatchObject({ reachable: true, authenticated: false, httpResponseCode: 401 });
    });
});
