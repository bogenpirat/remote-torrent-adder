import { describe, it, expect, vi } from "vitest";
import { callArgs } from "../helpers/assert";
import { FloodWebUI } from "../../src/webuis/flood-webui";
import { PorlaWebUI } from "../../src/webuis/porla-webui";
import { makeMagnetTorrent, makeWebUISettings } from "../helpers/fixtures";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

const settings = makeWebUISettings({ host: "h", port: 3000, username: "u", password: "p" });

const CLIENTS = [
    {
        name: "Flood",
        webUi: new FloodWebUI(settings),
        loginUrl: "http://h:3000/api/auth/authenticate",
        accepted: { success: true },
        rejected: { success: false },
    },
    {
        name: "Porla",
        webUi: new PorlaWebUI(settings),
        loginUrl: "http://h:3000/api/v1/auth/login",
        accepted: { token: "jwt-abc" },
        rejected: { error: "bad creds" },
    },
];

describe.each(CLIENTS)("$name testConnection", ({ webUi, loginUrl, accepted, rejected }) => {
    it("posts the credentials as JSON to the login endpoint", async () => {
        const fetch = queueFetch(mockResponse({ json: accepted }));

        await webUi.testConnection();

        expect(callArgs(fetch, 0)).toEqual([loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify({ username: "u", password: "p" }),
        }]);
    });

    it("reports reachable and authenticated when the login is accepted", async () => {
        queueFetch(mockResponse({ json: accepted }));

        await expect(webUi.testConnection()).resolves.toEqual({
            reachable: true,
            authenticated: true,
            httpResponseCode: 200,
            message: "Reachable & authenticated",
        });
    });

    it("reports a rejected login as reachable but not authenticated", async () => {
        queueFetch(mockResponse({ json: rejected }));

        await expect(webUi.testConnection()).resolves.toMatchObject({ reachable: true, authenticated: false, httpResponseCode: 200 });
    });

    it("reports an HTTP error status as reachable but not authenticated", async () => {
        queueFetch(mockResponse({ status: 401, body: "denied" }));

        await expect(webUi.testConnection()).resolves.toMatchObject({ reachable: true, authenticated: false, httpResponseCode: 401 });
    });

    it("reports unreachable when the request itself fails", async () => {
        (globalThis as any).fetch = vi.fn(() => Promise.reject(new Error("offline")));

        await expect(webUi.testConnection()).resolves.toEqual({
            reachable: false,
            authenticated: null,
            httpResponseCode: 0,
            message: "Could not reach server: offline",
        });
    });
});

describe.each(CLIENTS)("$name sendTorrent", ({ webUi }) => {
    it("reports the failure when the login request itself fails", async () => {
        (globalThis as any).fetch = vi.fn(() => Promise.reject(new Error("offline")));

        await expect(webUi.sendTorrent(makeMagnetTorrent(), {})).resolves.toEqual({
            success: false,
            httpResponseCode: 0,
            httpResponseBody: "offline",
        });
    });
});

describe("Porla testConnection", () => {
    it("treats a login answer without a token as not authenticated", async () => {
        queueFetch(mockResponse({ json: {} }));

        await expect(new PorlaWebUI(settings).testConnection()).resolves.toMatchObject({ reachable: true, authenticated: false });
    });
});
