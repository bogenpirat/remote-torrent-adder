import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChipList from "../../../src/options/components/ChipList";

function renderChipList(values: string[] = ["movies", "tv"], placeholder?: string) {
    const onChange = vi.fn();
    render(<ChipList label="Labels" values={values} onChange={onChange} placeholder={placeholder} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    return { onChange, chipInputs: inputs.slice(0, -1), newEntryInput: inputs.at(-1)! };
}

function addEntry(newEntryInput: HTMLInputElement, text: string): void {
    fireEvent.change(newEntryInput, { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("ChipList", () => {
    it("shows the label and one editable chip per value", () => {
        const { chipInputs } = renderChipList();

        expect(screen.getByText("Labels")).toBeInTheDocument();
        expect(chipInputs.map(input => input.value)).toEqual(["movies", "tv"]);
    });

    it("appends a trimmed new entry and clears the input", () => {
        const { onChange, newEntryInput } = renderChipList();

        addEntry(newEntryInput, "  anime ");

        expect(onChange).toHaveBeenCalledWith(["movies", "tv", "anime"]);
        expect(newEntryInput.value).toBe("");
    });

    it("ignores an entry that already exists", () => {
        const { onChange, newEntryInput } = renderChipList();

        addEntry(newEntryInput, "tv");

        expect(onChange).not.toHaveBeenCalled();
        expect(newEntryInput.value).toBe("tv");
    });

    it("ignores a blank entry", () => {
        const { onChange, newEntryInput } = renderChipList();

        addEntry(newEntryInput, "   ");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("removes the chip whose bin button is clicked", () => {
        const { onChange } = renderChipList();

        fireEvent.click(screen.getAllByRole("button", { name: "🗑" })[0]!);

        expect(onChange).toHaveBeenCalledWith(["tv"]);
    });

    it("replaces a value edited in place", () => {
        const { onChange, chipInputs } = renderChipList();

        fireEvent.change(chipInputs[1]!, { target: { value: "series" } });

        expect(onChange).toHaveBeenCalledWith(["movies", "series"]);
    });

    it("falls back to a generic placeholder", () => {
        expect(renderChipList([]).newEntryInput.placeholder).toBe("Add new entry");
    });

    it("uses the placeholder it is given", () => {
        expect(renderChipList([], "Add a label").newEntryInput.placeholder).toBe("Add a label");
    });
});
