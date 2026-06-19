import { describe, it, expect, vi } from "vitest";
import { showNotification } from "../../src/util/notifications";

describe("showNotification", () => {
    it("creates a basic notification with the success icon by default", () => {
        showNotification("Title", "Body", false);
        expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
        const [, options] = (chrome.notifications.create as any).mock.calls[0];
        expect(options).toMatchObject({
            type: "basic",
            title: "Title",
            message: "Body",
            iconUrl: "assets/icons/BitTorrent128.png",
        });
    });

    it("uses the red icon when the notification represents a failure", () => {
        showNotification("Title", "Body", true);
        const [, options] = (chrome.notifications.create as any).mock.calls[0];
        expect(options.iconUrl).toBe("assets/icons/BitTorrent128-red.png");
    });

    it("clears the notification after the configured duration", () => {
        vi.useFakeTimers();
        try {
            showNotification("T", "B", false, 1500);
            expect(chrome.notifications.clear).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1500);
            expect(chrome.notifications.clear).toHaveBeenCalledWith("notif-id", expect.any(Function));
        } finally {
            vi.useRealTimers();
        }
    });

    it("registers a click handler when a webui url is provided", () => {
        showNotification("T", "B", false, 2000, false, "http://h/");
        expect(chrome.notifications.onClicked.addListener).toHaveBeenCalled();
    });

    it("does not register a click handler without a webui url", () => {
        showNotification("T", "B", false);
        expect(chrome.notifications.onClicked.addListener).not.toHaveBeenCalled();
    });

    it("creates an offscreen document to play sound when requested", async () => {
        showNotification("T", "B", false, 2000, true);
        await Promise.resolve();
        await Promise.resolve();
        expect(chrome.offscreen.hasDocument).toHaveBeenCalled();
    });
});
