import { describe, it, expect, vi } from "vitest";
import { showNotification, registerNotificationClickListener } from "../../src/util/notifications";
import { BROWSER } from "../../src/util/platform";

describe("showNotification", () => {
    it("creates a basic notification with the success icon for a success", () => {
        showNotification({ title: "Title", message: "Body", kind: "success" });
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
        showNotification({ title: "Title", message: "Body", kind: "failure" });
        const [, options] = (chrome.notifications.create as any).mock.calls[0];
        expect(options.iconUrl).toBe("assets/icons/BitTorrent128-red.png");
    });

    it("clears the notification after the configured duration", async () => {
        vi.useFakeTimers();
        try {
            showNotification({ title: "T", message: "B", kind: "success", popupDurationMs: 1500 });
            await vi.advanceTimersByTimeAsync(0);
            expect(chrome.notifications.clear).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(1500);
            expect(chrome.notifications.clear).toHaveBeenCalledWith("notif-id");
        } finally {
            vi.useRealTimers();
        }
    });

    it("opens the webui when its notification is clicked", async () => {
        registerNotificationClickListener();
        showNotification({ title: "T", message: "B", kind: "success", clickUrl: "http://h/" });
        await Promise.resolve();
        const onClicked = (chrome.notifications.onClicked.addListener as any).mock.calls[0][0];

        onClicked("notif-id");
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://h/" });
    });

    it("ignores clicks on notifications without a stored url", async () => {
        registerNotificationClickListener();
        showNotification({ title: "T", message: "B", kind: "success" });
        await Promise.resolve();
        const onClicked = (chrome.notifications.onClicked.addListener as any).mock.calls[0][0];

        onClicked("notif-id");
        expect(chrome.tabs.create).not.toHaveBeenCalled();
    });

    it("logs the id of a notification that cannot be cleared", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.notifications.clear as any).mockRejectedValueOnce(new Error("already gone"));

        showNotification({ title: "T", message: "B", kind: "success", popupDurationMs: 0 });

        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
            "Failed clearing notification notif-id:",
            expect.objectContaining({ message: "already gone" }),
        ));
    });

    it("logs the url that could not be opened from a clicked notification", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.tabs.create as any).mockRejectedValueOnce(new Error("no window"));
        registerNotificationClickListener();
        showNotification({ title: "T", message: "B", kind: "success", clickUrl: "http://h/" });
        await Promise.resolve();
        const onClicked = (chrome.notifications.onClicked.addListener as any).mock.calls[0][0];

        onClicked("notif-id");

        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
            "Failed opening http://h/ from a notification:",
            expect.objectContaining({ message: "no window" }),
        ));
    });

    it("logs the kind and title of a notification that cannot be shown", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.notifications.create as any).mockRejectedValueOnce(new Error("permission denied"));

        showNotification({ title: "Torrent added", message: "B", kind: "success" });

        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
            'Failed showing the success notification "Torrent added":',
            expect.objectContaining({ message: "permission denied" }),
        ));
    });

    it.skipIf(BROWSER !== "chrome")("logs the kind of a notification sound that cannot be played", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        (chrome.offscreen.hasDocument as any).mockRejectedValueOnce(new Error("offscreen unavailable"));

        showNotification({ title: "T", message: "B", kind: "failure", playSound: true });

        await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
            "Failed playing the failure notification sound:",
            expect.objectContaining({ message: "offscreen unavailable" }),
        ));
    });

    it.skipIf(BROWSER !== "chrome")("creates an offscreen document to play sound when requested", async () => {
        showNotification({ title: "T", message: "B", kind: "success", playSound: true });
        await Promise.resolve();
        await Promise.resolve();
        expect(chrome.offscreen.hasDocument).toHaveBeenCalled();
    });
});
