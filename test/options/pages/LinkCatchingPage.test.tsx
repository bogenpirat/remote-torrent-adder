import { describe, it, expect } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import LinkCatchingPage from "../../../src/options/pages/LinkCatchingPage";
import { lastSavedSettings, renderWithSettings, respondWithSettings } from "../../helpers/options";

const TORRENT_FILE = /\.torrent$/;
const DOWNLOAD_PAGE = /download\.php/;

async function renderPage(linkCatchingRegexes: RegExp[] = [TORRENT_FILE, DOWNLOAD_PAGE]) {
    respondWithSettings({ linkCatchingEnabled: true, linkCatchingRegexes });
    renderWithSettings(<LinkCatchingPage />);
    return { newRegexInput: await screen.findByPlaceholderText("Add new regex") };
}

function savedSources(): string[] | undefined {
    return lastSavedSettings()?.linkCatchingRegexes.map(regex => regex.source);
}

function chipFor(source: string): HTMLElement {
    return screen.getByText(source).parentElement!;
}

function addRegex(newRegexInput: HTMLElement, source: string): void {
    fireEvent.change(newRegexInput, { target: { value: source } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

/** Opens the chip's editor, types the replacement and reports what the editor showed first. */
function editRegex(source: string, replacement: string): string {
    const chip = chipFor(source);
    fireEvent.click(within(chip).getByRole("button", { name: "✎" }));
    const editor = within(chip).getByRole("textbox") as HTMLInputElement;
    const initialValue = editor.value;
    fireEvent.change(editor, { target: { value: replacement } });
    return initialValue;
}

function clickButton(name: string): void {
    fireEvent.click(screen.getByRole("button", { name }));
}

function testLink(link: string): string[] {
    fireEvent.change(screen.getByPlaceholderText("Paste a link to test..."), { target: { value: link } });
    return screen.queryAllByRole("listitem").map(item => item.textContent ?? "");
}

describe("LinkCatchingPage regex list", () => {
    it("shows a loading notice until the settings arrive", () => {
        respondWithSettings();
        renderWithSettings(<LinkCatchingPage />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("persists the link catching toggle", async () => {
        await renderPage();

        fireEvent.click(screen.getByRole("checkbox", { name: "Enable link catching" }));

        expect(lastSavedSettings()!.linkCatchingEnabled).toBe(false);
    });

    it("lists the source of every stored regex", async () => {
        await renderPage();

        expect(screen.getByText(TORRENT_FILE.source)).toBeInTheDocument();
        expect(screen.getByText(DOWNLOAD_PAGE.source)).toBeInTheDocument();
    });

    it("appends a new regex and clears the input", async () => {
        const { newRegexInput } = await renderPage();

        addRegex(newRegexInput, "get\\.php");

        expect(savedSources()).toEqual([TORRENT_FILE.source, DOWNLOAD_PAGE.source, "get\\.php"]);
        expect((newRegexInput as HTMLInputElement).value).toBe("");
    });

    it("ignores a pattern that is not a valid regex", async () => {
        const { newRegexInput } = await renderPage();

        addRegex(newRegexInput, "(unclosed");

        expect(savedSources()).toBeUndefined();
        expect((newRegexInput as HTMLInputElement).value).toBe("(unclosed");
    });

    it("removes a regex", async () => {
        await renderPage();

        fireEvent.click(within(chipFor(TORRENT_FILE.source)).getByRole("button", { name: "🗑" }));

        expect(savedSources()).toEqual([DOWNLOAD_PAGE.source]);
    });
});

describe("LinkCatchingPage regex editing", () => {
    it("starts editing with the current source", async () => {
        await renderPage();

        expect(editRegex(TORRENT_FILE.source, "anything")).toBe(TORRENT_FILE.source);
    });

    it("saves the replacement in place and leaves edit mode", async () => {
        await renderPage();
        editRegex(TORRENT_FILE.source, "\\.torrent\\b");

        clickButton("✔");

        expect(savedSources()).toEqual(["\\.torrent\\b", DOWNLOAD_PAGE.source]);
        expect(screen.queryByRole("button", { name: "✔" })).toBeNull();
    });

    it("keeps the stored regex when editing is cancelled", async () => {
        await renderPage();
        editRegex(TORRENT_FILE.source, "changed");

        clickButton("✖");

        expect(savedSources()).toBeUndefined();
        expect(screen.getByText(TORRENT_FILE.source)).toBeInTheDocument();
    });

    it("stays in edit mode when the replacement is not a valid regex", async () => {
        await renderPage();
        editRegex(TORRENT_FILE.source, "(unclosed");

        clickButton("✔");

        expect(savedSources()).toBeUndefined();
        expect(screen.getByRole("button", { name: "✔" })).toBeInTheDocument();
    });
});

describe("LinkCatchingPage regex tester", () => {
    it("shows no results while the test field is empty", async () => {
        await renderPage();

        expect(screen.queryAllByRole("listitem")).toEqual([]);
    });

    it("marks which regexes match the tested link", async () => {
        await renderPage();

        expect(testLink("https://tracker.org/file.torrent")).toEqual([
            `${TORRENT_FILE.source}✔`,
            `${DOWNLOAD_PAGE.source}✖`,
            "magnet:✖",
        ]);
    });

    it("recognises a magnet link even without any regex", async () => {
        await renderPage([]);

        expect(testLink("magnet:?xt=urn:btih:abc")).toEqual(["magnet:✔"]);
    });
});
