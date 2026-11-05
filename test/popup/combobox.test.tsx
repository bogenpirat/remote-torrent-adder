import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComboBox } from "../../src/popup/components/ui/combobox";

const LONGER_THAN_ANY_CLICK_MS = 250;

interface HarnessProps {
    initialOptions?: string[];
    onRemove?: (option: string) => void;
}

function Harness({ initialOptions = ["movies", "tv", "music"], onRemove }: HarnessProps) {
    const [value, setValue] = useState("movies");
    const [options, setOptions] = useState(initialOptions);
    return (
        <>
            <ComboBox
                label="Label"
                value={value}
                onChange={setValue}
                options={options}
                onRemoveOption={option => {
                    onRemove?.(option);
                    setOptions(previous => previous.filter(entry => entry !== option));
                }}
            />
            <button>next control</button>
        </>
    );
}

function field() {
    return screen.getByRole("combobox", { name: "Label" });
}

beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

describe("ComboBox", () => {
    it("selects an option however long the mouse button is held", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());
        const option = screen.getByRole("option", { name: /tv/ });

        await user.pointer({ keys: "[MouseLeft>]", target: option });
        await new Promise(resolve => setTimeout(resolve, LONGER_THAN_ANY_CLICK_MS));
        await user.pointer({ keys: "[/MouseLeft]", target: option });

        expect(field()).toHaveValue("tv");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("keeps focus on the field after selecting and reopens when it is clicked again", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());
        await user.click(screen.getByRole("option", { name: /tv/ }));

        expect(field()).toHaveFocus();
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

        await user.click(field());

        expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("closes as soon as focus leaves the field, and tabbing skips the remove buttons", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());

        await user.tab();

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "next control" })).toHaveFocus();
    });

    it("picks an option with the arrow keys and enter", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());

        await user.keyboard("{ArrowDown}{ArrowDown}");
        expect(field()).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /tv/ }).id);

        await user.keyboard("{Enter}");

        expect(field()).toHaveValue("tv");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("wraps around the list in both directions", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());

        await user.keyboard("{ArrowUp}");
        expect(field()).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /music/ }).id);

        await user.keyboard("{ArrowDown}");
        expect(field()).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /movies/ }).id);
    });

    it("opens with the arrow keys after being closed", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

        await user.keyboard("{ArrowDown}");

        expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("closes with escape and leaves the value alone", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());
        await user.keyboard("{ArrowDown}{Escape}");

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(field()).toHaveValue("movies");
    });

    it("lets enter through to the surrounding form when no option is highlighted", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <Harness />
            </form>,
        );
        await user.click(field());

        await user.keyboard("{Enter}");

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not submit the surrounding form when an option is picked with enter", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <Harness />
            </form>,
        );
        await user.click(field());

        await user.keyboard("{ArrowDown}{Enter}");

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("removes an option without selecting it, submitting a surrounding form or closing the list", async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <Harness onRemove={onRemove} />
            </form>,
        );
        await user.click(field());

        const option = screen.getByRole("option", { name: /tv/ });
        await user.click(within(option).getByRole("button", { name: "Remove tv" }));

        expect(onRemove).toHaveBeenCalledWith("tv");
        expect(onSubmit).not.toHaveBeenCalled();
        expect(field()).toHaveValue("movies");
        expect(field()).toHaveFocus();
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: /tv/ })).not.toBeInTheDocument();
    });

    it("marks the current value as the selected option", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(field());

        expect(screen.getByRole("option", { name: /movies/ })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("option", { name: /tv/ })).toHaveAttribute("aria-selected", "false");
    });

    it("does not open or break on arrow keys when there are no options", async () => {
        const user = userEvent.setup();
        render(<Harness initialOptions={[]} />);
        await user.click(field());

        await user.keyboard("{ArrowDown}{ArrowUp}");

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(field()).toHaveAttribute("aria-expanded", "false");
    });
});
