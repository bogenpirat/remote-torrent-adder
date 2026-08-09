import { describe, it, expect, vi, beforeEach } from "vitest";
import { SETTINGS_KEY } from "../src/util/settings";
import { makeWebUISettings, seedWebUISettings } from "./helpers/fixtures";

/**
 * Boots the real service worker entrypoint, side effects and all. The module
 * registry is reset first so each test gets a fresh set of listener
 * registrations against the current chrome mock.
 *
 * The lifecycle event is dispatched as soon as its listener registers, because
 * Chrome starts the worker *in order to* deliver it: the handler runs while the
 * module's own top-level startup work is still in flight. Firing it after an
 * await instead would let that work drain first and hide every race against it.
 */
async function bootServiceWorker(event: "installed" | "startup" | "none" = "installed"): Promise<void> {
    if (event !== "none") {
        const registration = event === "installed"
            ? chrome.runtime.onInstalled.addListener
            : chrome.runtime.onStartup.addListener;
        (registration as any).mockImplementation((listener: () => void) => queueMicrotask(listener));
    }

    vi.resetModules();
    await import("../src/service_worker");
    await settle();
}

/**
 * Drains pending microtasks and timers. Booting fans out into several
 * independent promise chains (settings load, menu rebuild, CORS rules), so a
 * single await is not enough to let them all finish racing.
 */
async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}

function fireLifecycleEvent(event: { addListener: { mock: { calls: any[][] } } }): void {
    event.addListener.mock.calls.forEach(([listener]) => listener());
}

/**
 * Ids Chrome refused because it was already holding them — the exact condition
 * behind "Cannot create item with duplicate id". Recreating an id *after* a
 * removeAll is legitimate, so only genuine collisions land here.
 */
function duplicateMenuIds(): string[] {
    return (chrome as any).__rejectedMenuIds;
}

function rebuildCount(): number {
    return (chrome.contextMenus.removeAll as any).mock.calls.length;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("service worker boot on an unconfigured profile", () => {
    it("logs nothing to console.error", async () => {
        await bootServiceWorker();

        expect(consoleError).not.toHaveBeenCalled();
    });

    it("never creates the same context menu id twice", async () => {
        await bootServiceWorker();

        expect(duplicateMenuIds()).toEqual([]);
    });

    it("persists default settings so later boots are not unconfigured", async () => {
        await bootServiceWorker();

        expect((chrome as any).__storage[SETTINGS_KEY]).toBeDefined();
    });

    // Writing the defaults re-enters through storage.onChanged, so the menu is
    // built more than once. Harmless, but this pins the current cost.
    it("rebuilds the menu more than once because writing defaults re-triggers it", async () => {
        await bootServiceWorker();

        expect(rebuildCount()).toBeGreaterThan(1);
    });

    it("leaves a single usable parent entry in the menu", async () => {
        await bootServiceWorker();

        expect([...(chrome as any).__contextMenuIds]).toEqual(["server-main"]);
    });
});

describe("service worker boot on a configured profile", () => {
    it("creates one entry per configured webui without duplicates", async () => {
        seedWebUISettings([
            makeWebUISettings({ id: "a", name: "Server A" }),
            makeWebUISettings({ id: "b", name: "Server B" }),
        ]);

        await bootServiceWorker();

        expect(consoleError).not.toHaveBeenCalled();
        expect(duplicateMenuIds()).toEqual([]);
        expect([...(chrome as any).__contextMenuIds]).toEqual([
            "server-main",
            "server-0",
            "server-1",
            "sendall-separator",
            "server-all",
        ]);
    });

    it("survives a browser restart rebuilding the menu on top of an existing one", async () => {
        seedWebUISettings([makeWebUISettings({ id: "a", name: "Server A" })]);

        await bootServiceWorker();
        fireLifecycleEvent(chrome.runtime.onStartup as any);
        await settle();

        expect(consoleError).not.toHaveBeenCalled();
        expect([...(chrome as any).__contextMenuIds]).toEqual(["server-main"]);
    });

    it("rebuilds without duplicates when settings change while running", async () => {
        seedWebUISettings([makeWebUISettings({ id: "a", name: "Server A" })]);

        await bootServiceWorker();

        const { Settings } = await import("../src/util/settings");
        const settings = new Settings();
        const loaded = await settings.loadSettings();
        loaded.webuiSettings = [
            makeWebUISettings({ id: "a", name: "Server A" }),
            makeWebUISettings({ id: "b", name: "Server B" }),
        ];
        await settings.saveSettings(loaded);
        await settle();

        expect(consoleError).not.toHaveBeenCalled();
        expect([...(chrome as any).__contextMenuIds]).toEqual([
            "server-main",
            "server-0",
            "server-1",
            "sendall-separator",
            "server-all",
        ]);
    });
});
