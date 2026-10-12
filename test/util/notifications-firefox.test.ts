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
        showNotification({ title: "T", message: "B", kind: "success", playSound: true });
        await Promise.resolve();

        expect(playNotificationSound).toHaveBeenCalledWith("success");
        expect(chrome.offscreen.hasDocument).not.toHaveBeenCalled();
        expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    });

    it("still shows the notification itself", async () => {
        showNotification({ title: "T", message: "B", kind: "failure", playSound: false });
        await Promise.resolve();

        expect(chrome.notifications.create).toHaveBeenCalled();
        expect(playNotificationSound).not.toHaveBeenCalled();
    });
});
