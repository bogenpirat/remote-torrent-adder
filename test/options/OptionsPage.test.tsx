import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The tab panels each pull in the whole settings stack; this suite is about the
// tablist itself, so they are replaced with markers.
vi.mock("../../src/options/pages/WebUIsPage", () => ({ default: () => <div>WebUIs panel</div> }));
vi.mock("../../src/options/pages/IconClickPage", () => ({ default: () => <div>Icon Click panel</div> }));
vi.mock("../../src/options/pages/NotificationsPage", () => ({ default: () => <div>Notifications panel</div> }));
vi.mock("../../src/options/pages/LinkCatchingPage", () => ({ default: () => <div>Link Catching panel</div> }));
vi.mock("../../src/options/pages/ImportExportPage", () => ({ default: () => <div>Import Export panel</div> }));
vi.mock("../../src/options/pages/AboutPage", () => ({ default: () => <div>About panel</div> }));
vi.mock("../../src/options/SettingsContext", () => ({
    SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import OptionsPage from "../../src/options/OptionsPage";

const tabNames = ["WebUIs", "Icon Click", "Notifications", "Link Catching", "Import/Export Settings", "About"];

describe("options tablist semantics", () => {
    it("exposes a labelled tablist with one tab per section", () => {
        render(<OptionsPage />);

        const tablist = screen.getByRole("tablist", { name: "Options sections" });
        expect(tablist).toBeInTheDocument();
        expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(tabNames);
    });

    it("marks exactly one tab as selected", () => {
        render(<OptionsPage />);

        const selected = screen.getAllByRole("tab").filter(tab => tab.getAttribute("aria-selected") === "true");
        expect(selected).toHaveLength(1);
        expect(selected[0]).toHaveTextContent("WebUIs");
    });

    it("points each tab at the panel it controls", () => {
        render(<OptionsPage />);

        const tab = screen.getByRole("tab", { selected: true });
        const panel = screen.getByRole("tabpanel");
        expect(tab).toHaveAttribute("aria-controls", panel.id);
        expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    });

    it("keeps only the selected tab in the tab order", () => {
        render(<OptionsPage />);

        const tabs = screen.getAllByRole("tab");
        expect(tabs[0]).toHaveAttribute("tabindex", "0");
        tabs.slice(1).forEach(tab => expect(tab).toHaveAttribute("tabindex", "-1"));
    });

    it("renders only the active panel", () => {
        render(<OptionsPage />);

        expect(screen.getByText("WebUIs panel")).toBeInTheDocument();
        expect(screen.queryByText("About panel")).not.toBeInTheDocument();
    });
});

describe("switching tabs", () => {
    it("switches on click", async () => {
        render(<OptionsPage />);

        await userEvent.click(screen.getByRole("tab", { name: "About" }));

        expect(screen.getByText("About panel")).toBeInTheDocument();
        expect(screen.queryByText("WebUIs panel")).not.toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "About" })).toHaveAttribute("aria-selected", "true");
    });

    it("moves to the next tab with the right arrow", async () => {
        render(<OptionsPage />);
        screen.getByRole("tab", { name: "WebUIs" }).focus();

        await userEvent.keyboard("{ArrowRight}");

        expect(screen.getByRole("tab", { name: "Icon Click" })).toHaveFocus();
        expect(screen.getByText("Icon Click panel")).toBeInTheDocument();
    });

    it("moves to the previous tab with the left arrow", async () => {
        render(<OptionsPage />);
        screen.getByRole("tab", { name: "Icon Click" }).focus();

        await userEvent.keyboard("{ArrowLeft}");

        expect(screen.getByRole("tab", { name: "WebUIs" })).toHaveFocus();
    });

    it("wraps from the last tab to the first", async () => {
        render(<OptionsPage />);
        screen.getByRole("tab", { name: "About" }).focus();

        await userEvent.keyboard("{ArrowRight}");

        expect(screen.getByRole("tab", { name: "WebUIs" })).toHaveFocus();
    });

    it("wraps backwards from the first tab to the last", async () => {
        render(<OptionsPage />);
        screen.getByRole("tab", { name: "WebUIs" }).focus();

        await userEvent.keyboard("{ArrowLeft}");

        expect(screen.getByRole("tab", { name: "About" })).toHaveFocus();
    });

    it("jumps to the first and last tab with Home and End", async () => {
        render(<OptionsPage />);
        screen.getByRole("tab", { name: "Link Catching" }).focus();

        await userEvent.keyboard("{End}");
        expect(screen.getByRole("tab", { name: "About" })).toHaveFocus();

        await userEvent.keyboard("{Home}");
        expect(screen.getByRole("tab", { name: "WebUIs" })).toHaveFocus();
    });

    it("ignores keys that are not tab navigation", async () => {
        render(<OptionsPage />);
        screen.getByRole("tab", { name: "WebUIs" }).focus();

        await userEvent.keyboard("{ArrowDown}");

        expect(screen.getByRole("tab", { name: "WebUIs" })).toHaveFocus();
        expect(screen.getByText("WebUIs panel")).toBeInTheDocument();
    });
});
