import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Toggle from "../../../src/options/components/Toggle";

function renderToggle(overrides: Partial<React.ComponentProps<typeof Toggle>> = {}) {
    const onEnable = vi.fn();
    const onDisable = vi.fn();
    render(<Toggle checked={false} onEnable={onEnable} onDisable={onDisable} label="Play a sound" {...overrides} />);
    return { onEnable, onDisable, checkbox: screen.getByRole("checkbox") };
}

describe("Toggle", () => {
    it("asks to enable when an unchecked toggle is clicked", () => {
        const { onEnable, onDisable, checkbox } = renderToggle();

        fireEvent.click(checkbox);

        expect(onEnable).toHaveBeenCalledTimes(1);
        expect(onDisable).not.toHaveBeenCalled();
    });

    it("asks to disable when a checked toggle is clicked", () => {
        const { onEnable, onDisable, checkbox } = renderToggle({ checked: true });

        fireEvent.click(checkbox);

        expect(onDisable).toHaveBeenCalledTimes(1);
        expect(onEnable).not.toHaveBeenCalled();
    });

    it("shows its label", () => {
        renderToggle();

        expect(screen.getByText("Play a sound")).toBeInTheDocument();
    });
});
