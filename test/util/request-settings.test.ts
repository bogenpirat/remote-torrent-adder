import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestSerializedSettings } from "../../src/util/request-settings";
import { GetSettingsMessage } from "../../src/models/messages";

describe("requestSerializedSettings", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("resolves with the serialized settings on the first attempt", async () => {
        (chrome.runtime.sendMessage as any).mockResolvedValue("{\"ok\":true}");

        await expect(requestSerializedSettings()).resolves.toBe("{\"ok\":true}");
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(GetSettingsMessage);
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("retries when the service worker rejects because it is asleep", async () => {
        let attempts = 0;
        (chrome.runtime.sendMessage as any).mockImplementation(() => {
            attempts += 1;
            return attempts < 3
                ? Promise.reject(new Error("Could not establish connection."))
                : Promise.resolve("late");
        });

        const pending = requestSerializedSettings();
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toBe("late");
        expect(attempts).toBe(3);
    });

    it("retries a sleeping service worker with a backoff and resolves once it answers", async () => {
        let attempts = 0;
        (chrome.runtime.sendMessage as any).mockImplementation(() => {
            attempts += 1;
            return Promise.resolve(attempts < 3 ? undefined : "late");
        });

        const pending = requestSerializedSettings();
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toBe("late");
        expect(attempts).toBe(3);
    });

    it("gives up after three attempts and resolves null", async () => {
        (chrome.runtime.sendMessage as any).mockResolvedValue(undefined);

        const pending = requestSerializedSettings();
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toBeNull();
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
});
