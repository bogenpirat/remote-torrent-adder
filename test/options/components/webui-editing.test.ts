import { describe, it, expect, vi } from "vitest";
import { createWebUIEditing, getDefaultWebUISettings } from "../../../src/options/components/webui-editing";
import { makeWebUISettings } from "../../helpers/fixtures";

const ALPHA = makeWebUISettings({ id: "a", name: "Alpha" });
const BETA = makeWebUISettings({ id: "b", name: "Beta" });
const GAMMA = makeWebUISettings({ id: "c", name: "Gamma" });

function edit() {
    const save = vi.fn();
    return { save, editing: createWebUIEditing([ALPHA, BETA, GAMMA], save) };
}

describe("createWebUIEditing", () => {
    it("appends a WebUI at the end", () => {
        const { save, editing } = edit();
        const added = makeWebUISettings({ id: "d" });

        editing.append(added);

        expect(save).toHaveBeenCalledWith([ALPHA, BETA, GAMMA, added]);
    });

    it("replaces the WebUI with the given id", () => {
        const { save, editing } = edit();
        const renamed = { ...BETA, name: "Renamed" };

        editing.change("b", renamed);

        expect(save).toHaveBeenCalledWith([ALPHA, renamed, GAMMA]);
    });

    it("removes the WebUI with the given id", () => {
        const { save, editing } = edit();

        editing.remove("a");

        expect(save).toHaveBeenCalledWith([BETA, GAMMA]);
    });

    it("moves a WebUI to another position", () => {
        const { save, editing } = edit();

        editing.move(0, 2);

        expect(save).toHaveBeenCalledWith([BETA, GAMMA, ALPHA]);
    });

    it("saves nothing for a move that changes nothing", () => {
        const { save, editing } = edit();

        editing.move(1, 1);
        editing.move(0, -1);

        expect(save).not.toHaveBeenCalled();
    });

    it("promotes a WebUI to the front", () => {
        const { save, editing } = edit();

        editing.promote("c");

        expect(save).toHaveBeenCalledWith([GAMMA, ALPHA, BETA]);
    });

    it("saves nothing when asked to promote an unknown WebUI", () => {
        const { save, editing } = edit();

        editing.promote("missing");

        expect(save).not.toHaveBeenCalled();
    });
});

describe("getDefaultWebUISettings", () => {
    it("creates a draft with a fresh id and no client", () => {
        const draft = getDefaultWebUISettings();

        expect(draft).toMatchObject({ client: "", name: "", host: "", port: null, secure: false });
        expect(draft.id).not.toBe(getDefaultWebUISettings().id);
    });

    it("gives every draft collections of its own", () => {
        const first = getDefaultWebUISettings();
        first.labels.push("movies");
        first.autoLabelDirSettings.push({ criteria: [], label: null, dir: null });

        const second = getDefaultWebUISettings();

        expect(second.labels).toEqual([]);
        expect(second.autoLabelDirSettings).toEqual([]);
    });
});
