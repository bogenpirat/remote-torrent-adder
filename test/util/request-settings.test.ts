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
        (chrome.runtime.sendMessage as any).mockImplementation((_message: unknown, cb: (v?: string) => void) =>
            cb("{\"ok\":true}")
        );

        await expect(requestSerializedSettings()).resolves.toBe("{\"ok\":true}");
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(GetSettingsMessage, expect.any(Function));
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("reads lastError so Chrome does not log it as unchecked", async () => {
        const error = { message: "The message port closed before a response was received." };
        const lastError = vi.fn(() => error);
        Object.defineProperty(chrome.runtime, "lastError", { get: lastError, configurable: true });
        (chrome.runtime.sendMessage as any).mockImplementation((_message: unknown, cb: (v?: string) => void) =>
            cb(undefined)
        );

        const pending = requestSerializedSettings();
        await vi.runAllTimersAsync();
        await pending;

        expect(lastError).toHaveBeenCalled();
    });

    it("retries a sleeping service worker with a backoff and resolves once it answers", async () => {
        let attempts = 0;
        (chrome.runtime.sendMessage as any).mockImplementation((_message: unknown, cb: (v?: string) => void) => {
            attempts += 1;
            cb(attempts < 3 ? undefined : "late");
        });

        const pending = requestSerializedSettings();
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toBe("late");
        expect(attempts).toBe(3);
    });

    it("gives up after three attempts and resolves null", async () => {
        (chrome.runtime.sendMessage as any).mockImplementation((_message: unknown, cb: (v?: string) => void) =>
            cb(undefined)
        );

        const pending = requestSerializedSettings();
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toBeNull();
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
});
