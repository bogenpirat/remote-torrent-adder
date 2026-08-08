import { describe, it, expect, vi } from "vitest";
import { CloudflareChallengeError, downloadTorrent } from "../../src/util/download";
import { FetchTorrentInPageMessage } from "../../src/models/messages";
import { bytesToBase64 } from "../../src/util/torrent-bytes";
import { mockResponse, queueFetch } from "../helpers/fetch-mock";
import { buildBencodedTorrent } from "../helpers/fixtures";

const CLOUDFLARE_CHALLENGE_BODY =
    "<html><head><script src='/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1'></script></head></html>";

function bencodedTorrent(name = "ubuntu.iso"): string {
    return buildBencodedTorrent({ announce: "http://tracker.one/announce", info: { name } });
}

function pageResponse(body: string, over: Record<string, unknown> = {}) {
    return {
        fetched: {
            ok: true,
            status: 200,
            statusText: "OK",
            contentType: "application/x-bittorrent",
            cfMitigated: null,
            finalUrl: "https://tracker.org/get/1.torrent",
            base64: bytesToBase64(new TextEncoder().encode(body)),
            ...over,
        },
    };
}

describe("downloadTorrent (magnet)", () => {
    it("returns magnet metadata without fetching", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }));
        const torrent = await downloadTorrent("magnet:?xt=urn:btih:abc&dn=My+Movie");

        expect(fetch).not.toHaveBeenCalled();
        expect(torrent.isMagnet).toBe(true);
        expect(torrent.data).toBe("magnet:?xt=urn:btih:abc&dn=My+Movie");
        expect(torrent.name).toBe("My Movie");
    });

    it("populates the trackers from the magnet's tr parameters", async () => {
        queueFetch(mockResponse({ status: 200 }));
        const torrent = await downloadTorrent("magnet:?xt=urn:btih:abc&tr=http%3A%2F%2Ftracker.one%2Fannounce");

        expect(torrent.trackers).toEqual(["http://tracker.one/announce"]);
    });
});

describe("downloadTorrent (file)", () => {
    it("fetches, decodes and parses a bencoded torrent", async () => {
        const body = buildBencodedTorrent({
            announce: "http://tracker.one/announce",
            "announce-list": [["http://tracker.two/announce"]],
            info: {
                name: "ubuntu.iso",
                private: 1,
                files: [{ path: ["folder", "a.bin"] }, { path: ["b.bin"] }],
            },
        });
        queueFetch(mockResponse({ status: 200, body }));

        const torrent = await downloadTorrent("https://site.com/ubuntu.torrent");
        expect(torrent.isMagnet).toBe(false);
        expect(torrent.name).toBe("ubuntu.iso");
        expect(torrent.data).toBeInstanceOf(Blob);
        expect(torrent.trackers).toEqual(["http://tracker.one/announce", "http://tracker.two/announce"]);
        expect(torrent.files).toEqual(["folder/a.bin", "b.bin"]);
        expect(torrent.isPrivate).toBe(true);
    });

    it("falls back to the url filename when the torrent has no name", async () => {
        const body = buildBencodedTorrent({ announce: "http://t/announce", info: {} });
        queueFetch(mockResponse({ status: 200, body }));

        const torrent = await downloadTorrent("https://site.com/path/cool.torrent");
        expect(torrent.name).toBe("cool.torrent");
    });

    it("rejects when the response is not ok", async () => {
        queueFetch(mockResponse({ status: 404, body: "" }));
        await expect(downloadTorrent("https://site.com/missing.torrent")).rejects.toThrow(/Status not OK/);
    });

    it("rejects with a helpful message when the body is not a torrent", async () => {
        queueFetch(mockResponse({ status: 200, body: "<html>nope</html>", headers: { "Content-Type": "text/html; charset=utf-8" } }));
        await expect(downloadTorrent("https://site.com/fake.torrent")).rejects.toThrow(/text\/html instead of a torrent/);
    });

    it("keeps the whole content type when it carries no parameters", async () => {
        queueFetch(mockResponse({ status: 200, body: "<html>nope</html>", headers: { "Content-Type": "text/html" } }));
        await expect(downloadTorrent("https://site.com/fake.torrent")).rejects.toThrow(/Received text\/html instead/);
    });

    it("sends cookies and a page referer with the worker request", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: bencodedTorrent() }));

        await downloadTorrent("https://tracker.org/get/1.torrent", { pageUrl: "https://tracker.org/browse?id=7" });

        expect(fetch.mock.calls[0]![1]).toEqual({ credentials: "include" });
        const addedRule = (chrome.declarativeNetRequest.updateDynamicRules as any).mock.calls[0][0].addRules[0];
        expect(addedRule.action.requestHeaders).toEqual([
            { header: "Referer", operation: "set", value: "https://tracker.org/browse?id=7" },
            { header: "Origin", operation: "remove" },
        ]);
    });

    it("refuses a response too large to be a torrent file", async () => {
        queueFetch(mockResponse({ status: 200, body: "x".repeat(25 * 1024 * 1024 + 1) }));
        await expect(downloadTorrent("https://site.com/huge.torrent")).rejects.toThrow(/far too large/);
    });
});

describe("downloadTorrent (through the page)", () => {
    it("asks the clicked tab's frame to fetch the torrent and never touches the worker's fetch", async () => {
        const fetch = queueFetch(mockResponse({ status: 200 }));
        (chrome.tabs.sendMessage as any).mockResolvedValue(pageResponse(bencodedTorrent()));

        const torrent = await downloadTorrent("https://tracker.org/get/1.torrent", { tabId: 9, frameId: 3 });

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
            9,
            { action: FetchTorrentInPageMessage.action, url: "https://tracker.org/get/1.torrent" },
            { frameId: 3 },
        );
        expect(fetch).not.toHaveBeenCalled();
        expect(torrent.name).toBe("ubuntu.iso");
    });

    it("falls back to the worker when no content script answers", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const fetch = queueFetch(mockResponse({ status: 200, body: bencodedTorrent("from-worker") }));
        (chrome.tabs.sendMessage as any).mockRejectedValue(new Error("Could not establish connection."));

        const torrent = await downloadTorrent("https://tracker.org/get/1.torrent", { tabId: 9 });

        expect(fetch).toHaveBeenCalled();
        expect(torrent.name).toBe("from-worker");
    });

    it("falls back to the worker when the page's fetch failed", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const fetch = queueFetch(mockResponse({ status: 200, body: bencodedTorrent("from-worker") }));
        (chrome.tabs.sendMessage as any).mockResolvedValue({ error: "Failed to fetch" });

        await downloadTorrent("https://tracker.org/get/1.torrent", { tabId: 9 });

        expect(fetch).toHaveBeenCalled();
    });

    it("does not retry through the worker when the page itself was challenged", async () => {
        const fetch = queueFetch(mockResponse({ status: 200, body: bencodedTorrent() }));
        (chrome.tabs.sendMessage as any).mockResolvedValue(pageResponse(CLOUDFLARE_CHALLENGE_BODY, {
            ok: false,
            status: 403,
            contentType: "text/html; charset=utf-8",
            base64: bytesToBase64(new TextEncoder().encode(CLOUDFLARE_CHALLENGE_BODY)),
        }));

        await expect(downloadTorrent("https://tracker.org/get/1.torrent", { tabId: 9 })).rejects.toThrow(CloudflareChallengeError);
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe("downloadTorrent (cloudflare)", () => {
    it("recognizes a challenge from the cf-mitigated header", async () => {
        queueFetch(mockResponse({ status: 403, body: "", headers: { "cf-mitigated": "challenge" } }));

        await expect(downloadTorrent("https://tracker.org/get/1.torrent"))
            .rejects.toThrow(/Open the link in a tab/);
    });

    it("recognizes a challenge from the interstitial body", async () => {
        queueFetch(mockResponse({
            status: 403,
            body: CLOUDFLARE_CHALLENGE_BODY,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        }));

        const error = await downloadTorrent("https://tracker.org/get/1.torrent").catch((e: unknown) => e);
        expect(error).toBeInstanceOf(CloudflareChallengeError);
        expect((error as CloudflareChallengeError).challengeUrl).toBe("https://tracker.org/get/1.torrent");
    });

    it("leaves an ordinary 403 alone", async () => {
        queueFetch(mockResponse({ status: 403, body: "no", headers: { "Content-Type": "text/html" } }));

        await expect(downloadTorrent("https://tracker.org/get/1.torrent")).rejects.toThrow(/Status not OK: 403/);
    });
});
