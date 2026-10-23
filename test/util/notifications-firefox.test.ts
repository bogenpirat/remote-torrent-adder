import { describe, it, expect, vi, beforeEach } from "vitest";

const { playNotificationSound } = vi.hoisted(() => ({
    playNotificationSound: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../src/util/platform", () => ({
    BROWSER: "firefox",
    isFirefox: () => true,
    canUseOffscreen: () => false,
}));

vi.mock("../../src/util/play-sound", () => ({ playNotificationSound }));

const { showNotification } = await import("../../src/util/notifications");

describe("showNotification without an offscreen API", () => {
    beforeEach(() => playNotificationSound.mockClear());

    it("plays the sound in-process instead of spawning an offscreen document", async () => {
        showNotification("T", "B", false, 2000, true);
        await Promise.resolve();

        expect(playNotificationSound).toHaveBeenCalledWith(false);
        expect(chrome.offscreen.hasDocument).not.toHaveBeenCalled();
        expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    });

    it("still shows the notification itself", async () => {
        showNotification("T", "B", true, 2000, false);
        await Promise.resolve();

        expect(chrome.notifications.create).toHaveBeenCalled();
        expect(playNotificationSound).not.toHaveBeenCalled();
    });

    it("leaves the add-label button off, since firefox rejects notifications with buttons", async () => {
        showNotification("T", "B", false, 2000, false, "http://h/", { webUiId: "w1", infoHash: "0123456789abcdef0123456789abcdef01234567", torrentName: "Cool" });
        await Promise.resolve();

        expect((chrome.notifications.create as any).mock.calls[0][1].buttons).toBeUndefined();
        expect(chrome.storage.session.set).not.toHaveBeenCalled();
    });
});
