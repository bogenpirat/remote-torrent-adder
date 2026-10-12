import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Toggle } from "../../src/popup/components/ui/toggle";

function renderToggle(overrides: Partial<React.ComponentProps<typeof Toggle>> = {}) {
    const onEnable = vi.fn();
    const onDisable = vi.fn();
    render(<Toggle checked={false} onEnable={onEnable} onDisable={onDisable} label="Start Paused" {...overrides} />);
    return { onEnable, onDisable, track: screen.getByRole("button", { name: "" }), label: screen.getByText("Start Paused") };
}

describe("popup Toggle", () => {
    it("asks to enable when an unchecked toggle is clicked", () => {
        const { onEnable, onDisable, track } = renderToggle();

        fireEvent.click(track);

        expect(onEnable).toHaveBeenCalledTimes(1);
        expect(onDisable).not.toHaveBeenCalled();
    });

    it("asks to disable when a checked toggle is clicked", () => {
        const { onEnable, onDisable, track } = renderToggle({ checked: true });

        fireEvent.click(track);

        expect(onDisable).toHaveBeenCalledTimes(1);
        expect(onEnable).not.toHaveBeenCalled();
    });

    it("toggles from the label with the keyboard", () => {
        const { onEnable, label } = renderToggle();

        fireEvent.keyDown(label, { key: "Enter" });

        expect(onEnable).toHaveBeenCalledTimes(1);
    });

    it("reports nothing while disabled", () => {
        const { onEnable, onDisable, label } = renderToggle({ disabled: true });

        fireEvent.click(label);

        expect(onEnable).not.toHaveBeenCalled();
        expect(onDisable).not.toHaveBeenCalled();
    });
});
