import { describe, it, expect } from "vitest";
import { fetchTorrentInPage } from "../../src/content-script/torrent-fetch";
import { base64ToBytes } from "../../src/util/torrent-bytes";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";

describe("fetchTorrentInPage", () => {
    it("fetches a same-origin link as the page itself would", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "d4:infod4:name2:hieee" }));

        const fetched = await fetchTorrentInPage(`${location.origin}/get/1.torrent`);

        expect(fetch.mock.calls[0]![1]).toEqual({ mode: "same-origin", credentials: "include", redirect: "follow" });
        expect(new TextDecoder().decode(base64ToBytes(fetched.base64))).toBe("d4:infod4:name2:hieee");
        expect(fetched.ok).toBe(true);
    });

    it("uses cors mode for a link pointing at another host", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: "" }));

        await fetchTorrentInPage("https://cdn.elsewhere.net/get/1.torrent");

        expect((fetch.mock.calls[0]![1] as RequestInit).mode).toBe("cors");
    });

    it("reports the status, content type and cf-mitigated header back to the worker", async () => {
        queueFetch(mockResponse({
            status: 403,
            body: "challenge",
            url: "https://tracker.org/get/1.torrent?redirected",
            headers: { "Content-Type": "text/html; charset=utf-8", "cf-mitigated": "challenge" },
        }));

        const fetched = await fetchTorrentInPage("https://tracker.org/get/1.torrent");

        expect(fetched.ok).toBe(false);
        expect(fetched.status).toBe(403);
        expect(fetched.contentType).toBe("text/html; charset=utf-8");
        expect(fetched.cfMitigated).toBe("challenge");
        expect(fetched.finalUrl).toBe("https://tracker.org/get/1.torrent?redirected");
    });

    it("refuses to hand back a response too large to be a torrent file", async () => {
        queueFetch(mockResponse({ status: 200, body: "x".repeat(25 * 1024 * 1024 + 1) }));

        await expect(fetchTorrentInPage("https://tracker.org/get/1.torrent")).rejects.toThrow(/far too large/);
    });
});
