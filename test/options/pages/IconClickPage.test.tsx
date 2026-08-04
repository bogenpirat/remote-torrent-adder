import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "../../../src/options/SettingsContext";
import IconClickPage from "../../../src/options/pages/IconClickPage";
import { GetSettingsMessage, SaveSettingsMessage } from "../../../src/models/messages";
import { serializeSettings, deserializeSettings } from "../../../src/util/serializer";
import { getDefaultSettings } from "../../../src/util/settings-defaults";
import { makeWebUISettings } from "../../helpers/fixtures";

function respondWithSettings(settings = getDefaultSettings()) {
    (chrome.runtime.sendMessage as any).mockImplementation((message: any, callback?: (r: any) => void) => {
        if (message.action === GetSettingsMessage.action) {
            callback?.(serializeSettings(settings));
        }
        return Promise.resolve();
    });
}

const renderPage = () => render(<SettingsProvider><IconClickPage /></SettingsProvider>);

describe("IconClickPage", () => {
    it("defaults to opening the primary WebUI", async () => {
        respondWithSettings();
        renderPage();

        expect(await screen.findByRole("radio", { name: /Open the primary WebUI/ })).toBeChecked();
    });

    it("disables the WebUI picker option when fewer than two WebUIs are configured", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [makeWebUISettings()];
        respondWithSettings(settings);
        renderPage();

        expect(await screen.findByRole("radio", { name: /Let me choose which WebUI to open/ })).toBeDisabled();
    });

    it("enables the WebUI picker option when two or more WebUIs are configured", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [makeWebUISettings({ id: "a" }), makeWebUISettings({ id: "b" })];
        respondWithSettings(settings);
        renderPage();

        expect(await screen.findByRole("radio", { name: /Let me choose which WebUI to open/ })).toBeEnabled();
    });

    it("persists the chosen behavior", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [makeWebUISettings({ id: "a" }), makeWebUISettings({ id: "b" })];
        respondWithSettings(settings);
        renderPage();

        await userEvent.click(await screen.findByRole("radio", { name: /Show links found on this page/ }));

        const save = (chrome.runtime.sendMessage as any).mock.calls
            .map((call: any[]) => call[0])
            .find((message: any) => message?.action === SaveSettingsMessage.action);
        expect(deserializeSettings(save.settings)!.iconClickAction).toBe("showPageLinks");
    });
});
