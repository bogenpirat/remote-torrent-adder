import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Toggle } from "../../src/popup/components/ui/toggle";

function renderToggle(overrides: Partial<React.ComponentProps<typeof Toggle>> = {}) {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Start Paused" {...overrides} />);
    return { onChange, track: screen.getByRole("button", { name: "" }), label: screen.getByText("Start Paused") };
}

describe("popup Toggle", () => {
    it("reports true when an unchecked toggle is clicked", () => {
        const { onChange, track } = renderToggle();

        fireEvent.click(track);

        expect(onChange.mock.calls).toEqual([[true]]);
    });

    it("reports false when a checked toggle is clicked", () => {
        const { onChange, track } = renderToggle({ checked: true });

        fireEvent.click(track);

        expect(onChange.mock.calls).toEqual([[false]]);
    });

    it("toggles from the label with the keyboard", () => {
        const { onChange, label } = renderToggle();

        fireEvent.keyDown(label, { key: "Enter" });

        expect(onChange.mock.calls).toEqual([[true]]);
    });

    it("reports nothing while disabled", () => {
        const { onChange, label } = renderToggle({ disabled: true });

        fireEvent.click(label);

        expect(onChange).not.toHaveBeenCalled();
    });
});
