import { describe, it, expect, vi } from "vitest";
import { showNotification, registerNotificationButtonListener, registerNotificationClickListener } from "../../src/util/notifications";
import { BROWSER } from "../../src/util/platform";

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

    it("clears the notification after the configured duration", async () => {
        vi.useFakeTimers();
        try {
            showNotification("T", "B", false, 1500);
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
        showNotification("T", "B", false, 2000, false, "http://h/");
        await Promise.resolve();
        const onClicked = (chrome.notifications.onClicked.addListener as any).mock.calls[0][0];

        onClicked("notif-id");
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://h/" });
    });

    it("ignores clicks on notifications without a stored url", async () => {
        registerNotificationClickListener();
        showNotification("T", "B", false); // no webui url
        await Promise.resolve();
        const onClicked = (chrome.notifications.onClicked.addListener as any).mock.calls[0][0];

        onClicked("notif-id");
        expect(chrome.tabs.create).not.toHaveBeenCalled();
    });

    it.skipIf(BROWSER !== "chrome")("creates an offscreen document to play sound when requested", async () => {
        showNotification("T", "B", false, 2000, true);
        await Promise.resolve();
        await Promise.resolve();
        expect(chrome.offscreen.hasDocument).toHaveBeenCalled();
    });
});

describe("the add-label button", () => {
    const labelAction = { webUiId: "w1", infoHash: "0123456789abcdef0123456789abcdef01234567", torrentName: "Cool Torrent" };

    it("is only shown when a label action is given", async () => {
        showNotification("T", "B", false, 2000, false, "http://h/");
        showNotification("T", "B", false, 2000, false, "http://h/", labelAction);
        await Promise.resolve();

        expect((chrome.notifications.create as any).mock.calls[0][1].buttons).toBeUndefined();
        expect((chrome.notifications.create as any).mock.calls[1][1].buttons).toEqual([{ title: "Add label" }]);
    });

    it("opens the label window for the torrent and dismisses the notification", async () => {
        registerNotificationButtonListener();
        showNotification("T", "B", false, 2000, false, "http://h/", labelAction);
        await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled());
        const onButtonClicked = (chrome.notifications.onButtonClicked.addListener as any).mock.calls[0][0];

        onButtonClicked("notif-id", 0);

        await vi.waitFor(() => expect(chrome.windows.create).toHaveBeenCalled());
        const url = new URL((chrome.windows.create as any).mock.calls[0][0].url, "chrome-extension://rta/");
        expect(url.pathname).toBe("/popup/popup.html");
        expect(Object.fromEntries(url.searchParams)).toEqual({ mode: "label", ...labelAction });
        expect(chrome.notifications.clear).toHaveBeenCalledWith("notif-id");
    });

    it("forgets the label action once the notification times out", async () => {
        vi.useFakeTimers();
        try {
            registerNotificationButtonListener();
            showNotification("T", "B", false, 1500, false, "http://h/", labelAction);
            await vi.advanceTimersByTimeAsync(1500);
            const onButtonClicked = (chrome.notifications.onButtonClicked.addListener as any).mock.calls[0][0];

            onButtonClicked("notif-id", 0);
            await vi.advanceTimersByTimeAsync(0);

            expect(chrome.storage.session.remove).toHaveBeenCalledWith("notificationLabelAction:notif-id");
            expect(chrome.windows.create).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });
});
