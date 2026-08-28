import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "../../../src/options/SettingsContext";
import WebUIsPage from "../../../src/options/pages/WebUIsPage";
import { GetSettingsMessage, SaveSettingsMessage } from "../../../src/models/messages";
import { serializeSettings, deserializeSettings } from "../../../src/util/serializer";
import { getDefaultSettings } from "../../../src/util/settings-defaults";
import { type WebUISettings } from "../../../src/models/webui";
import { makeWebUISettings } from "../../helpers/fixtures";

function respondWithWebUIs(webuiSettings = [makeWebUISettings({ id: "a", name: "Alpha" }), makeWebUISettings({ id: "b", name: "Beta" })]) {
    const settings = getDefaultSettings();
    settings.webuiSettings = webuiSettings;
    (chrome.runtime.sendMessage as any).mockImplementation((message: any, callback?: (r: any) => void) => {
        if (message.action === GetSettingsMessage.action) {
            callback?.(serializeSettings(settings));
        }
        return Promise.resolve();
    });
}

const savedWebUIs = () => {
    const save = (chrome.runtime.sendMessage as any).mock.calls
        .map((call: any[]) => call[0])
        .findLast((message: any) => message?.action === SaveSettingsMessage.action);
    return save ? deserializeSettings(save.settings)!.webuiSettings : null;
};

const renderPage = () => render(<SettingsProvider><WebUIsPage /></SettingsProvider>);

const webUIWithoutAutoLabelDirSettings = () => {
    const webui = makeWebUISettings({ id: "a", name: "Alpha" });
    delete (webui as Partial<WebUISettings>).autoLabelDirSettings;
    return webui;
};

describe("WebUIsPage", () => {
    it("removes the selected WebUI once the removal is confirmed", async () => {
        respondWithWebUIs();
        renderPage();

        await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
        await userEvent.click(screen.getByRole("button", { name: "For real?" }));

        expect(savedWebUIs()!.map(w => w.id)).toEqual(["b"]);
    });

    it("keeps the selected WebUI when the removal is cancelled", async () => {
        respondWithWebUIs();
        renderPage();

        await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
        expect(savedWebUIs()).toBeNull();
    });

    it("disarms a pending removal confirmation when another WebUI is selected", async () => {
        respondWithWebUIs();
        renderPage();

        await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
        expect(screen.getByRole("button", { name: "For real?" })).toBeInTheDocument();

        await userEvent.click(screen.getByText("Beta"));

        expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "For real?" })).not.toBeInTheDocument();
    });

    it("re-arms the confirmation independently after switching back", async () => {
        respondWithWebUIs();
        renderPage();

        await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
        await userEvent.click(screen.getByText("Beta"));
        await userEvent.click(screen.getByText("Alpha"));

        expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
        expect(savedWebUIs()).toBeNull();
    });

    it("renders a WebUI whose stored settings predate autoLabelDirSettings", async () => {
        respondWithWebUIs([webUIWithoutAutoLabelDirSettings()]);
        renderPage();

        expect(await screen.findByText("Auto Label/Dir Settings")).toBeInTheDocument();
        expect(screen.getByText("No rules defined yet.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    });

    it("keeps a rule editable after adding one to a WebUI that had no autoLabelDirSettings", async () => {
        respondWithWebUIs([webUIWithoutAutoLabelDirSettings()]);
        renderPage();

        await userEvent.click(await screen.findByRole("button", { name: "Add Rule" }));

        expect(screen.queryByText("No rules defined yet.")).not.toBeInTheDocument();
        expect(savedWebUIs()![0]!.autoLabelDirSettings).toEqual([{ criteria: [], label: "", dir: "" }]);
    });

    it("renders the stored rules, including torrent name criteria", async () => {
        respondWithWebUIs([makeWebUISettings({
            id: "a",
            name: "Alpha",
            autoLabelDirSettings: [{ criteria: [{ field: "torrentName", value: "2160p" }], label: "uhd", dir: null }],
        })]);
        renderPage();

        expect(await screen.findByText("Auto Label/Dir Settings")).toBeInTheDocument();
        expect(screen.queryByText("No rules defined yet.")).not.toBeInTheDocument();
        expect(screen.getByText("Torrent name:")).toBeInTheDocument();
        expect(screen.getByText("2160p")).toBeInTheDocument();
    });
});
