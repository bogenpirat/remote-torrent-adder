import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ComboBox } from "../../src/popup/components/ui/combobox";

function renderComboBox(overrides: Partial<React.ComponentProps<typeof ComboBox>> = {}) {
    const onChange = vi.fn();
    const onRemoveOption = vi.fn();
    render(<ComboBox options={["movies", "tv"]} value="" onChange={onChange} onRemoveOption={onRemoveOption} {...overrides} />);
    return { onChange, onRemoveOption, input: screen.getByRole("textbox") };
}

describe("ComboBox", () => {
    it("keeps the options hidden until the input is focused", () => {
        const { input } = renderComboBox();
        expect(screen.queryByText("movies")).toBeNull();

        fireEvent.focus(input);

        expect(screen.getByText("movies")).toBeInTheDocument();
        expect(screen.getByText("tv")).toBeInTheDocument();
    });

    it("reports typed text and opens the options", () => {
        const { input, onChange } = renderComboBox();

        fireEvent.change(input, { target: { value: "mov" } });

        expect(onChange).toHaveBeenCalledWith("mov");
        expect(screen.getByText("movies")).toBeInTheDocument();
    });

    it("reports the chosen option and closes the list", () => {
        const { input, onChange } = renderComboBox();
        fireEvent.focus(input);

        fireEvent.click(screen.getByText("tv"));

        expect(onChange).toHaveBeenCalledWith("tv");
        expect(screen.queryByText("movies")).toBeNull();
    });

    it("removes an option without selecting it", () => {
        const { input, onChange, onRemoveOption } = renderComboBox();
        fireEvent.focus(input);

        fireEvent.click(screen.getAllByTitle("Remove this option")[0]!);

        expect(onRemoveOption).toHaveBeenCalledWith("movies");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("offers no remove buttons when options cannot be removed", () => {
        const { input } = renderComboBox({ onRemoveOption: undefined });

        fireEvent.focus(input);

        expect(screen.queryByTitle("Remove this option")).toBeNull();
    });

    it("closes the list shortly after the input loses focus", () => {
        vi.useFakeTimers();
        try {
            const { input } = renderComboBox();
            fireEvent.focus(input);

            fireEvent.blur(input);
            act(() => void vi.advanceTimersByTime(150));

            expect(screen.queryByText("movies")).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it("marks a value that is not among the options as new", () => {
        renderComboBox({ value: "anime" });

        expect(screen.getByTitle("New value will be added")).toBeInTheDocument();
    });

    it("does not mark a known or empty value as new", () => {
        renderComboBox({ value: " tv " });

        expect(screen.queryByTitle("New value will be added")).toBeNull();
    });

    it("shows the label and the rainbow outline when asked to", () => {
        const { input } = renderComboBox({ label: "Label", rainbowOutline: true, placeholder: "Pick one" });

        expect(screen.getByText("Label")).toBeInTheDocument();
        expect(input).toHaveClass("rainbow-outline");
        expect(input).toHaveAttribute("placeholder", "Pick one");
    });
});
