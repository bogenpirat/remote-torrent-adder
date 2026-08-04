import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageLinksView from "../../src/popup/app/PageLinksView";
import { GetPageLinksMessage, PreAddTorrentMessage } from "../../src/models/messages";

beforeEach(() => {
    vi.spyOn(window, "close").mockImplementation(() => undefined);
    (chrome.tabs.query as any).mockResolvedValue([{ id: 42 }]);
});

describe("PageLinksView", () => {
    it("lists the links the content script found", async () => {
        (chrome.tabs.sendMessage as any).mockResolvedValue({
            links: [
                { url: "https://example.com/a.torrent", label: "Ubuntu ISO" },
                { url: "magnet:?xt=urn:btih:abc", label: "Debian" },
            ],
        });

        render(<PageLinksView />);

        expect(await screen.findByText("Ubuntu ISO")).toBeInTheDocument();
        expect(screen.getByText("Debian")).toBeInTheDocument();
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, GetPageLinksMessage, { frameId: 0 });
    });

    it("says so when no links are found", async () => {
        (chrome.tabs.sendMessage as any).mockResolvedValue({ links: [] });

        render(<PageLinksView />);

        expect(await screen.findByText("No links found")).toBeInTheDocument();
    });

    it("shows an error notice when the content script can't be reached", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.tabs.sendMessage as any).mockRejectedValue(new Error("Could not establish connection."));

        render(<PageLinksView />);

        expect(await screen.findByText("Could not scan this page")).toBeInTheDocument();
    });

    it("adding a link fires the same message a real page click would, then closes", async () => {
        (chrome.tabs.sendMessage as any).mockResolvedValue({
            links: [{ url: "https://example.com/a.torrent", label: "Ubuntu ISO" }],
        });

        render(<PageLinksView />);
        await userEvent.click(await screen.findByText("Ubuntu ISO"));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            action: PreAddTorrentMessage.action,
            url: "https://example.com/a.torrent",
        });
        expect(window.close).toHaveBeenCalled();
    });
});
