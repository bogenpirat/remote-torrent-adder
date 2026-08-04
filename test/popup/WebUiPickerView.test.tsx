import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WebUiPickerView from "../../src/popup/app/WebUiPickerView";
import { GetSettingsMessage } from "../../src/models/messages";
import { serializeSettings } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { makeWebUISettings } from "../helpers/fixtures";

function respondWithSettings(settings = getDefaultSettings()) {
    (chrome.runtime.sendMessage as any).mockImplementation((message: any, callback?: (r: any) => void) => {
        if (message.action === GetSettingsMessage.action) {
            callback?.(serializeSettings(settings));
        }
        return Promise.resolve();
    });
}

beforeEach(() => {
    vi.spyOn(window, "close").mockImplementation(() => undefined);
});

describe("WebUiPickerView", () => {
    it("lists every configured WebUI", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [
            makeWebUISettings({ id: "a", name: "Home qBittorrent", host: "h1", port: 8080 }),
            makeWebUISettings({ id: "b", name: "Seedbox", host: "h2", port: 9091 }),
        ];
        respondWithSettings(settings);

        render(<WebUiPickerView />);

        expect(await screen.findByText("Home qBittorrent")).toBeInTheDocument();
        expect(screen.getByText("Seedbox")).toBeInTheDocument();
    });

    it("says so when no WebUI is configured", async () => {
        respondWithSettings();
        render(<WebUiPickerView />);

        expect(await screen.findByText("No WebUIs configured")).toBeInTheDocument();
    });

    it("opens the chosen WebUI and closes the popup", async () => {
        const settings = getDefaultSettings();
        settings.webuiSettings = [makeWebUISettings({ id: "a", name: "Home qBittorrent", host: "h1", port: 8080 })];
        respondWithSettings(settings);

        render(<WebUiPickerView />);
        await userEvent.click(await screen.findByText("Home qBittorrent"));

        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://h1:8080/", active: true });
        expect(window.close).toHaveBeenCalled();
    });
});
