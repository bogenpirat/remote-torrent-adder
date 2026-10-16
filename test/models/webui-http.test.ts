import { describe, it, expect } from "vitest";
import {
    HttpError,
    createBasicAuthHeaders,
    fetchOrThrow,
    probeWithBasicAuth,
    toFailureResult,
    toAuthenticatedResult,
    toRejectedResult,
    toUnreachableResult,
    unreachableResultWithMessage,
} from "../../src/models/webui-http";
import { callArgs } from "../helpers/assert";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

describe("fetchOrThrow", () => {
    it("returns the response when ok", async () => {
        queueFetch(mockResponse({ status: 200 }));

        const response = await fetchOrThrow("http://x");

        expect(response.status).toBe(200);
    });

    it("throws an HttpError carrying the status and body on a non-ok response", async () => {
        queueFetch(mockResponse({ status: 500, body: "boom" }));

        await expect(fetchOrThrow("http://x")).rejects.toMatchObject({
            name: "HttpError",
            message: "HTTP error 500",
            status: 500,
            body: "boom",
        });
    });
});

describe("createBasicAuthHeaders", () => {
    it("encodes the credentials as a basic authorization header", () => {
        expect(createBasicAuthHeaders({ username: "u", password: "p" })).toEqual({ Authorization: "Basic " + btoa("u:p") });
    });

    it("sends no header when neither a username nor a password is set", () => {
        expect(createBasicAuthHeaders({ username: "", password: "" })).toEqual({});
    });
});

const CREDENTIALS = { username: "u", password: "p" };

describe("toFailureResult", () => {
    it("reports the status and body of an HTTP error", () => {
        expect(toFailureResult(new HttpError(502, "bad gateway"))).toEqual({
            success: false,
            httpResponseCode: 502,
            httpResponseBody: "bad gateway",
        });
    });

    it("reports any other error with code 0 and its message", () => {
        expect(toFailureResult(new Error("offline"))).toEqual({ success: false, httpResponseCode: 0, httpResponseBody: "offline" });
    });
});

describe("toAuthenticatedResult", () => {
    it("reports the client as reachable with accepted credentials", () => {
        expect(toAuthenticatedResult(200)).toEqual({
            reachable: true,
            authenticated: true,
            httpResponseCode: 200,
            message: "Reachable & authenticated",
        });
    });
});

describe("toRejectedResult", () => {
    it("reports the client as reachable with rejected credentials", () => {
        expect(toRejectedResult(401)).toEqual({
            reachable: true,
            authenticated: false,
            httpResponseCode: 401,
            message: "Reachable, but authentication failed",
        });
    });
});

describe("unreachableResultWithMessage", () => {
    it("reports an unreachable server with the given message and no status", () => {
        expect(unreachableResultWithMessage("No client selected")).toEqual({
            reachable: false,
            authenticated: null,
            httpResponseCode: 0,
            message: "No client selected",
        });
    });
});

describe("toUnreachableResult", () => {
    it("keeps the status of an HTTP error", () => {
        expect(toUnreachableResult(new HttpError(503, ""))).toEqual({
            reachable: false,
            authenticated: null,
            httpResponseCode: 503,
            message: "Could not reach server: HTTP error 503",
        });
    });
});

describe("probeWithBasicAuth", () => {
    it("sends the credentials and reports an accepted login", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }));

        await expect(probeWithBasicAuth("http://h/x", CREDENTIALS)).resolves.toMatchObject({ reachable: true, authenticated: true });
        expect(callArgs(fetch, 0)).toEqual(["http://h/x", { method: "GET", headers: { Authorization: "Basic " + btoa("u:p") } }]);
    });

    it.each([401, 403])("reports status %i as reachable but not authenticated", async status => {
        queueFetch(mockResponse({ status }));

        await expect(probeWithBasicAuth("http://h/x", CREDENTIALS)).resolves.toMatchObject({
            reachable: true,
            authenticated: false,
            httpResponseCode: status,
        });
    });

    it("reports a network failure as unreachable", async () => {
        queueFetch(() => {
            throw new Error("offline");
        });

        await expect(probeWithBasicAuth("http://h/x", CREDENTIALS)).resolves.toMatchObject({ reachable: false, httpResponseCode: 0 });
    });
});
