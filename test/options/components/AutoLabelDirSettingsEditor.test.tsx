import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AutoLabelDirSettingsEditor from "../../../src/options/components/AutoLabelDirSettingsEditor";
import { type AutoLabelDirSetting } from "../../../src/models/webui";

type EditorProps = React.ComponentProps<typeof AutoLabelDirSettingsEditor>;

const TRACKER_CRITERION = { field: "trackerUrl" as const, value: "tracker\\.org" };
const RULE: AutoLabelDirSetting = { criteria: [TRACKER_CRITERION], label: "movies", dir: null };

function renderEditor(overrides: Partial<EditorProps> = {}) {
    const onChange = vi.fn();
    const props: EditorProps = {
        value: [RULE],
        onChange,
        showLabel: true,
        showDir: true,
        labels: ["movies", "tv"],
        dirs: ["/data"],
        defaultLabel: null,
        defaultDir: null,
        ...overrides,
    };
    render(<AutoLabelDirSettingsEditor {...props} />);
    return { onChange, selects: screen.queryAllByRole("combobox") as HTMLSelectElement[] };
}

function optionTexts(select: HTMLSelectElement): string[] {
    return Array.from(select.options).map(option => option.textContent ?? "");
}

function patternInput(): HTMLElement {
    return screen.getAllByRole("textbox")[0]!;
}

function addCriterion(fieldSelect: HTMLSelectElement, field: string, pattern: string): void {
    fireEvent.change(fieldSelect, { target: { value: field } });
    fireEvent.change(patternInput(), { target: { value: pattern } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("AutoLabelDirSettingsEditor rules", () => {
    it("says so when no rule is defined and offers no tester", () => {
        renderEditor({ value: [] });

        expect(screen.getByText("No rules defined yet.")).toBeInTheDocument();
        expect(screen.queryByText("Test these rules")).toBeNull();
    });

    it("offers the tester once a rule exists", () => {
        renderEditor();

        expect(screen.getByText("Test these rules")).toBeInTheDocument();
    });

    it("adds an empty rule with a label and a directory to fill in", () => {
        const { onChange } = renderEditor();

        fireEvent.click(screen.getByRole("button", { name: "Add Rule" }));

        expect(onChange).toHaveBeenCalledWith([RULE, { criteria: [], label: "", dir: "" }]);
    });

    it("adds a rule without label or directory when the client supports neither", () => {
        const { onChange } = renderEditor({ showLabel: false, showDir: false });

        fireEvent.click(screen.getByRole("button", { name: "Add Rule" }));

        expect(onChange).toHaveBeenCalledWith([RULE, { criteria: [], label: null, dir: null }]);
    });

    it("removes a rule", () => {
        const { onChange } = renderEditor();

        fireEvent.click(screen.getByTitle("Remove rule"));

        expect(onChange).toHaveBeenCalledWith([]);
    });
});

describe("AutoLabelDirSettingsEditor criteria", () => {
    it("shows each criterion with the name of its field", () => {
        renderEditor();

        expect(screen.getByText("Tracker URL:")).toBeInTheDocument();
        expect(screen.getByText(TRACKER_CRITERION.value)).toBeInTheDocument();
    });

    it("appends a trimmed criterion for the chosen field", () => {
        const { onChange, selects } = renderEditor();

        addCriterion(selects[0]!, "filePath", "  \\.mkv$ ");

        expect(onChange).toHaveBeenCalledWith([{ ...RULE, criteria: [TRACKER_CRITERION, { field: "filePath", value: "\\.mkv$" }] }]);
    });

    it("ignores a blank criterion", () => {
        const { onChange, selects } = renderEditor();

        addCriterion(selects[0]!, "trackerUrl", "   ");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("removes a criterion", () => {
        const { onChange } = renderEditor();
        const criterionRemoveButton = screen.getAllByRole("button", { name: "🗑" }).find(button => !button.title)!;

        fireEvent.click(criterionRemoveButton);

        expect(onChange).toHaveBeenCalledWith([{ ...RULE, criteria: [] }]);
    });

    it("suggests a pattern that fits the chosen field", () => {
        const { selects } = renderEditor();
        fireEvent.change(selects[0]!, { target: { value: "torrentName" } });

        expect(patternInput()).toHaveAttribute("placeholder", "e.g. 2160p");
    });
});

describe("AutoLabelDirSettingsEditor label and directory", () => {
    it("offers the known labels and directories", () => {
        const { selects } = renderEditor();

        expect(optionTexts(selects[1]!)).toEqual(["(none)", "movies", "tv"]);
        expect(optionTexts(selects[2]!)).toEqual(["(none)", "/data"]);
    });

    it("keeps offering a stored label that is no longer in the list", () => {
        const { selects } = renderEditor({ value: [{ ...RULE, label: "retired" }] });

        expect(optionTexts(selects[1]!)).toEqual(["(none)", "retired", "movies", "tv"]);
    });

    it("stores the chosen label and directory", () => {
        const { onChange, selects } = renderEditor();

        fireEvent.change(selects[1]!, { target: { value: "tv" } });
        fireEvent.change(selects[2]!, { target: { value: "/data" } });

        expect(onChange).toHaveBeenNthCalledWith(1, [{ ...RULE, label: "tv" }]);
        expect(onChange).toHaveBeenNthCalledWith(2, [{ ...RULE, dir: "/data" }]);
    });

    it("stores no label at all when none is chosen", () => {
        const { onChange, selects } = renderEditor();

        fireEvent.change(selects[1]!, { target: { value: "" } });

        expect(onChange).toHaveBeenCalledWith([{ ...RULE, label: null }]);
    });

    it("offers only what the client supports", () => {
        const { selects } = renderEditor({ showLabel: false });

        expect(screen.queryByText("Label")).toBeNull();
        expect(optionTexts(selects[1]!)).toEqual(["(none)", "/data"]);
    });
});
