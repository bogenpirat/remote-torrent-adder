import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider, useSettings } from "../../src/options/SettingsContext";
import { GetSettingsMessage, SaveSettingsMessage } from "../../src/models/messages";
import { serializeSettings, deserializeSettings } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";
import { callArgs } from "../helpers/assert";

/** Answers GetSettings with the given settings, like the service worker does. */
function respondWithSettings(settings = getDefaultSettings()) {
    (chrome.runtime.sendMessage as any).mockImplementation((message: any, callback?: (r: any) => void) => {
        if (message.action === GetSettingsMessage.action) {
            callback?.(serializeSettings(settings));
        }
        return Promise.resolve();
    });
}

function Probe() {
    const { settings, updateSetting, loading } = useSettings();
    if (loading) return <div>loading</div>;
    return (
        <div>
            <span data-testid="duration">{settings?.notificationsDurationMs}</span>
            <button onClick={() => updateSetting("notificationsDurationMs", 9999)}>bump</button>
        </div>
    );
}

const renderProbe = () => render(<SettingsProvider><Probe /></SettingsProvider>);

describe("SettingsContext", () => {
    it("shows a loading state until settings arrive", () => {
        (chrome.runtime.sendMessage as any).mockImplementation(() => Promise.resolve());

        renderProbe();

        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("exposes the settings the service worker returns", async () => {
        const stored = getDefaultSettings();
        stored.notificationsDurationMs = 4321;
        respondWithSettings(stored);

        renderProbe();

        expect(await screen.findByTestId("duration")).toHaveTextContent("4321");
    });

    it("sends an updated setting back to the service worker", async () => {
        respondWithSettings();
        renderProbe();
        await screen.findByTestId("duration");

        await userEvent.click(screen.getByRole("button", { name: "bump" }));

        await waitFor(() => {
            const saves = (chrome.runtime.sendMessage as any).mock.calls
                .filter((call: any[]) => call[0]?.action === SaveSettingsMessage.action);
            expect(saves).toHaveLength(1);
        });
    });

    it("persists the full settings object, not just the changed key", async () => {
        const stored = getDefaultSettings();
        stored.notificationsSoundEnabled = true;
        respondWithSettings(stored);
        renderProbe();
        await screen.findByTestId("duration");

        await userEvent.click(screen.getByRole("button", { name: "bump" }));

        await waitFor(() => {
            const save = (chrome.runtime.sendMessage as any).mock.calls
                .find((call: any[]) => call[0]?.action === SaveSettingsMessage.action);
            const persisted = deserializeSettings(save[0].settings)!;
            expect(persisted.notificationsDurationMs).toBe(9999);
            expect(persisted.notificationsSoundEnabled).toBe(true);
        });
    });

    it("reflects the new value immediately, without waiting for a round trip", async () => {
        respondWithSettings();
        renderProbe();
        await screen.findByTestId("duration");

        await userEvent.click(screen.getByRole("button", { name: "bump" }));

        expect(screen.getByTestId("duration")).toHaveTextContent("9999");
    });

    it("requests settings exactly once on mount", async () => {
        respondWithSettings();
        renderProbe();
        await screen.findByTestId("duration");

        const gets = (chrome.runtime.sendMessage as any).mock.calls
            .filter((call: any[]) => call[0]?.action === GetSettingsMessage.action);
        expect(gets).toHaveLength(1);
        expect(callArgs(chrome.runtime.sendMessage as any, 0)[0].action).toBe(GetSettingsMessage.action);
    });

    it("throws when used outside a provider, rather than silently returning nothing", () => {
        expect(() => render(<Probe />)).toThrow(/must be used within a SettingsProvider/);
    });
});
