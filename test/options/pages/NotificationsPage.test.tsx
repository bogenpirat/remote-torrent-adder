import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import NotificationsPage from "../../../src/options/pages/NotificationsPage";
import { TestNotificationMessage } from "../../../src/models/messages";
import { type RTASettings } from "../../../src/models/settings";
import { getCustomSound, saveCustomSound } from "../../../src/util/sound-storage";
import { lastSavedSettings, renderWithSettings, respondWithSettings, sentMessages } from "../../helpers/options";

const playedSources: string[] = [];

class FakeAudio {
    constructor(source: string) {
        playedSources.push(source);
    }
    addEventListener = vi.fn();
    play(): Promise<void> {
        return Promise.resolve();
    }
}

function soundFile(name: string, sizeInBytes = 4): File {
    return new File([new Uint8Array(sizeInBytes)], name, { type: "audio/ogg" });
}

async function renderPage(overrides: Partial<RTASettings> = {}) {
    respondWithSettings({ notificationsEnabled: true, notificationsSoundEnabled: true, notificationsDurationMs: 3000, ...overrides });
    renderWithSettings(<NotificationsPage />);
    await screen.findByRole("checkbox", { name: "Show notifications" });
}

async function soundRow(label: string): Promise<HTMLElement> {
    const row = (await screen.findByText(label)).parentElement!;
    await waitFor(() => expect(row.querySelector("button")).toBeEnabled());
    return row;
}

function buttonIn(row: HTMLElement, name: string): HTMLButtonElement | undefined {
    return Array.from(row.querySelectorAll("button")).find(button => button.textContent?.trim() === name);
}

function chooseFile(row: HTMLElement, file: File): void {
    fireEvent.change(row.querySelector('input[type="file"]')!, { target: { files: [file] } });
}

beforeEach(() => {
    playedSources.length = 0;
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("alert", vi.fn());
    URL.createObjectURL = vi.fn(() => "blob:custom-sound");
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("NotificationsPage settings", () => {
    it("shows a loading notice until the settings arrive", () => {
        respondWithSettings();
        renderWithSettings(<NotificationsPage />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("persists the notifications toggle", async () => {
        await renderPage();

        fireEvent.click(screen.getByRole("checkbox", { name: "Show notifications" }));

        expect(lastSavedSettings()!.notificationsEnabled).toBe(false);
    });

    it("persists the sound toggle", async () => {
        await renderPage();

        fireEvent.click(screen.getByRole("checkbox", { name: "Play a sound" }));

        expect(lastSavedSettings()!.notificationsSoundEnabled).toBe(false);
    });

    it("persists the display duration as a number", async () => {
        await renderPage();

        fireEvent.change(screen.getByLabelText("Display duration"), { target: { value: "1500" } });

        expect(lastSavedSettings()!.notificationsDurationMs).toBe(1500);
    });

    it("offers custom sounds only while sounds are enabled", async () => {
        await renderPage({ notificationsSoundEnabled: false });

        expect(screen.queryByText("Custom sounds")).toBeNull();
        expect(screen.queryByText("Success sound")).toBeNull();
    });
});

describe("NotificationsPage test buttons", () => {
    it("asks for a successful test notification with the current settings", async () => {
        await renderPage();

        fireEvent.click(screen.getByRole("button", { name: "Test Success Notification" }));

        expect(sentMessages(TestNotificationMessage.action)).toEqual([{
            action: TestNotificationMessage.action,
            title: "Test Notification",
            message: "This is a successful notification.",
            isFailed: false,
            popupDurationMs: 3000,
            playSound: true,
        }]);
    });

    it("asks for a failed test notification", async () => {
        await renderPage({ notificationsSoundEnabled: false });

        fireEvent.click(screen.getByRole("button", { name: "Test Failed Notification" }));

        expect(sentMessages(TestNotificationMessage.action)).toEqual([{
            action: TestNotificationMessage.action,
            title: "Test Notification",
            message: "This is a failed notification.",
            isFailed: true,
            popupDurationMs: 3000,
            playSound: false,
        }]);
    });
});

describe("NotificationsPage custom sounds", () => {
    it("names the default sound while nothing is stored and offers no reset", async () => {
        await renderPage();
        const row = await soundRow("Success sound");

        expect(row).toHaveTextContent("Default sound");
        expect(buttonIn(row, "Reset")).toBeUndefined();
    });

    it("names a stored sound and offers to reset it", async () => {
        await saveCustomSound("failure", soundFile("oops.ogg"), "oops.ogg");
        await renderPage();
        const row = await soundRow("Failure sound");

        expect(row).toHaveTextContent("oops.ogg");
        expect(buttonIn(row, "Reset")).toBeDefined();
    });

    it("stores a chosen file and shows its name", async () => {
        await renderPage();
        const row = await soundRow("Success sound");

        chooseFile(row, soundFile("ding.ogg"));

        await waitFor(() => expect(row).toHaveTextContent("ding.ogg"));
        expect((await getCustomSound("success"))?.name).toBe("ding.ogg");
    });

    it("refuses a file above the size limit", async () => {
        await renderPage();
        const row = await soundRow("Success sound");

        chooseFile(row, soundFile("huge.ogg", 1024 * 1024 + 1));

        expect(alert).toHaveBeenCalledWith("That sound file is too large (max 1024 KB).");
        expect(await getCustomSound("success")).toBeUndefined();
    });

    it("removes a stored sound on reset", async () => {
        await saveCustomSound("success", soundFile("ding.ogg"), "ding.ogg");
        await renderPage();
        const row = await soundRow("Success sound");

        fireEvent.click(buttonIn(row, "Reset")!);

        await waitFor(() => expect(row).toHaveTextContent("Default sound"));
        expect(await getCustomSound("success")).toBeUndefined();
    });

    it("previews the built-in sound when nothing is stored", async () => {
        await renderPage();

        fireEvent.click(buttonIn(await soundRow("Failure sound"), "▶")!);

        await waitFor(() => expect(playedSources).toEqual(["../assets/sounds/failure.ogg"]));
    });

    it("previews the stored sound when there is one", async () => {
        await saveCustomSound("success", soundFile("ding.ogg"), "ding.ogg");
        await renderPage();

        fireEvent.click(buttonIn(await soundRow("Success sound"), "▶")!);

        await waitFor(() => expect(playedSources).toEqual(["blob:custom-sound"]));
    });
});
