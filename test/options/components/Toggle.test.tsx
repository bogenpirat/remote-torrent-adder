import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Toggle from "../../../src/options/components/Toggle";

function renderToggle(overrides: Partial<React.ComponentProps<typeof Toggle>> = {}) {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Play a sound" {...overrides} />);
    return { onChange, checkbox: screen.getByRole("checkbox") };
}

describe("Toggle", () => {
    it("reports true when an unchecked toggle is clicked", () => {
        const { onChange, checkbox } = renderToggle();

        fireEvent.click(checkbox);

        expect(onChange.mock.calls).toEqual([[true]]);
    });

    it("reports false when a checked toggle is clicked", () => {
        const { onChange, checkbox } = renderToggle({ checked: true });

        fireEvent.click(checkbox);

        expect(onChange.mock.calls).toEqual([[false]]);
    });

    it("shows its label", () => {
        renderToggle();

        expect(screen.getByText("Play a sound")).toBeInTheDocument();
    });
});
