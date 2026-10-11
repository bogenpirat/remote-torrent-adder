import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import ImportExportPage from "../../../src/options/pages/ImportExportPage";
import { serializeSettings } from "../../../src/util/serializer";
import { getDefaultSettings } from "../../../src/util/settings-defaults";
import { makeWebUISettings } from "../../helpers/fixtures";
import { lastSavedSettings, renderWithSettings, respondWithSettings } from "../../helpers/options";

const writeText = vi.fn(() => Promise.resolve());

async function renderPage() {
    const settings = respondWithSettings({ notificationsDurationMs: 4321 });
    renderWithSettings(<ImportExportPage />);
    const exportBox = await screen.findByLabelText("Copy this and keep it somewhere safe.") as HTMLTextAreaElement;
    return { settings, exportBox, importBox: screen.getByLabelText("Paste a previously exported configuration.") };
}

function importText(importBox: HTMLElement, text: string): void {
    fireEvent.change(importBox, { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Import settings" }));
}

beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

describe("ImportExportPage", () => {
    it("shows a loading notice until the settings arrive", () => {
        respondWithSettings();
        renderWithSettings(<ImportExportPage />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("offers the serialized settings for export", async () => {
        const { settings, exportBox } = await renderPage();

        expect(exportBox.value).toBe(serializeSettings(settings));
        expect(exportBox.readOnly).toBe(true);
    });

    it("copies the export to the clipboard and confirms it briefly", async () => {
        const { settings } = await renderPage();
        vi.useFakeTimers();
        try {
            fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

            expect(writeText).toHaveBeenCalledWith(serializeSettings(settings));
            expect(screen.getByRole("button", { name: "Copied!" })).toHaveClass("rta-button--success");
            act(() => void vi.advanceTimersByTime(1500));
            expect(screen.getByRole("button", { name: "Copy to clipboard" })).toHaveClass("rta-button--accent");
        } finally {
            vi.useRealTimers();
        }
    });

    it("saves an imported configuration and clears the import box", async () => {
        const { importBox } = await renderPage();
        const imported = { ...getDefaultSettings(), webuiSettings: [makeWebUISettings({ id: "imported" })] };

        importText(importBox, serializeSettings(imported));

        expect(lastSavedSettings()!.webuiSettings.map(webUi => webUi.id)).toEqual(["imported"]);
        expect((importBox as HTMLTextAreaElement).value).toBe("");
    });

    it("reports text that is not JSON", async () => {
        const { importBox } = await renderPage();

        importText(importBox, "{not json");

        expect(screen.getByRole("alert")).toHaveTextContent("That is not valid JSON.");
        expect(importBox).toHaveAttribute("aria-invalid", "true");
        expect(lastSavedSettings()).toBeUndefined();
    });

    it("reports JSON that is not a settings export", async () => {
        const { importBox } = await renderPage();

        importText(importBox, '{"foo":1}');

        expect(screen.getByRole("alert")).toHaveTextContent("That JSON is not a Remote Torrent Adder settings export.");
        expect(lastSavedSettings()).toBeUndefined();
    });

    it("reports an empty import", async () => {
        const { importBox } = await renderPage();

        importText(importBox, "");

        expect(screen.getByRole("alert")).toHaveTextContent("That JSON is not a Remote Torrent Adder settings export.");
    });

    it("clears an earlier error once an import succeeds", async () => {
        const { importBox } = await renderPage();
        importText(importBox, "{not json");

        importText(importBox, serializeSettings(getDefaultSettings()));

        expect(screen.queryByRole("alert")).toBeNull();
    });
});
