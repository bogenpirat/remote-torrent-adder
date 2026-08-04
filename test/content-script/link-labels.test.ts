import { describe, it, expect } from "vitest";
import { deriveLinkLabel, isMagnetLink } from "../../src/content-script/link-labels";

function anchor(html: string): HTMLAnchorElement {
    const container = document.createElement("div");
    container.innerHTML = html;
    return container.querySelector("a")!;
}

describe("isMagnetLink", () => {
    it("recognizes magnet URIs", () => {
        expect(isMagnetLink("magnet:?xt=urn:btih:abc123")).toBe(true);
    });

    it("rejects non-magnet URLs", () => {
        expect(isMagnetLink("https://example.com/file.torrent")).toBe(false);
    });
});

describe("deriveLinkLabel", () => {
    it("prefers the element's own text content", () => {
        const element = anchor(`<a href="file.torrent">Download Now</a>`);
        expect(deriveLinkLabel(element, "https://example.com/file.torrent")).toBe("Download Now");
    });

    it("falls back to an input's value when there is no text content", () => {
        const input = document.createElement("input");
        input.value = "Get it";
        expect(deriveLinkLabel(input, "https://example.com/file.torrent")).toBe("Get it");
    });

    it("falls back to aria-label or title when there is no text or value", () => {
        const element = anchor(`<a href="file.torrent" aria-label="Season pack"></a>`);
        expect(deriveLinkLabel(element, "https://example.com/file.torrent")).toBe("Season pack");
    });

    it("decodes the dn= parameter for unlabeled magnet links", () => {
        const element = anchor(`<a href="magnet:?xt=urn:btih:abc123&dn=Cool+Torrent"></a>`);
        expect(deriveLinkLabel(element, "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent")).toBe("Cool Torrent");
    });

    it("falls back to the last path segment when nothing else is available", () => {
        const element = anchor(`<a href="https://example.com/downloads/file.torrent"></a>`);
        expect(deriveLinkLabel(element, "https://example.com/downloads/file.torrent")).toBe("file.torrent");
    });

    it("decodes the last path segment", () => {
        const element = anchor(`<a href="https://example.com/downloads/Cool%20Torrent.torrent"></a>`);
        expect(deriveLinkLabel(element, "https://example.com/downloads/Cool%20Torrent.torrent")).toBe("Cool Torrent.torrent");
    });

    it("falls back to the raw url when the last segment is empty, e.g. a trailing slash", () => {
        const element = anchor(`<a href="https://example.com/downloads/"></a>`);
        expect(deriveLinkLabel(element, "https://example.com/downloads/")).toBe("https://example.com/downloads/");
    });
});
