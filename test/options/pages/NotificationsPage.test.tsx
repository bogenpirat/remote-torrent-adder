import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const platform = vi.hoisted(() => ({ firefox: false }));
vi.mock("../../../src/util/platform", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    isFirefox: () => platform.firefox,
}));

import { SettingsProvider } from "../../../src/options/SettingsContext";
import NotificationsPage from "../../../src/options/pages/NotificationsPage";
import { GetSettingsMessage, SaveSettingsMessage } from "../../../src/models/messages";
import { serializeSettings, deserializeSettings } from "../../../src/util/serializer";
import { getDefaultSettings } from "../../../src/util/settings-defaults";

const BUTTON_TOGGLE = /Offer an "Add label" button after adding/;

function respondWithSettings(settings = getDefaultSettings()) {
    (chrome.runtime.sendMessage as any).mockImplementation((message: any) => {
        if (message.action === GetSettingsMessage.action) {
            return Promise.resolve(serializeSettings(settings));
        }
        return Promise.resolve();
    });
}

const renderPage = () => render(<SettingsProvider><NotificationsPage /></SettingsProvider>);

beforeEach(() => {
    platform.firefox = false;
});

describe("NotificationsPage add-label button toggle", () => {
    it("is on by default", async () => {
        respondWithSettings();
        renderPage();

        expect(await screen.findByRole("checkbox", { name: BUTTON_TOGGLE })).toBeChecked();
    });

    it("treats settings saved before the toggle existed as on", async () => {
        const settings = getDefaultSettings() as Partial<ReturnType<typeof getDefaultSettings>>;
        delete settings.notificationsLabelButtonEnabled;
        respondWithSettings(settings as ReturnType<typeof getDefaultSettings>);
        renderPage();

        expect(await screen.findByRole("checkbox", { name: BUTTON_TOGGLE })).toBeChecked();
    });

    it("persists turning it off", async () => {
        respondWithSettings();
        renderPage();

        await userEvent.click(await screen.findByRole("checkbox", { name: BUTTON_TOGGLE }));

        const save = (chrome.runtime.sendMessage as any).mock.calls
            .map((call: any[]) => call[0])
            .find((message: any) => message?.action === SaveSettingsMessage.action);
        expect(deserializeSettings(save.settings)!.notificationsLabelButtonEnabled).toBe(false);
    });

    it("is hidden on firefox, where notifications cannot carry buttons", async () => {
        platform.firefox = true;
        respondWithSettings();
        renderPage();

        expect(await screen.findByRole("checkbox", { name: /Play a sound/ })).toBeInTheDocument();
        expect(screen.queryByRole("checkbox", { name: BUTTON_TOGGLE })).not.toBeInTheDocument();
    });
});
