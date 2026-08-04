import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { loadPopupData, submitTorrent } = vi.hoisted(() => ({
    loadPopupData: vi.fn(),
    submitTorrent: vi.fn(),
}));
vi.mock("../../src/popup/popup-data", () => ({ loadPopupData, submitTorrent }));
vi.mock("../../src/popup/app/WebUiPickerView", () => ({ default: () => <div>WebUI picker view</div> }));
vi.mock("../../src/popup/app/PageLinksView", () => ({ default: () => <div>Page links view</div> }));

import Home from "../../src/popup/app/page";
import type { PopupData } from "../../src/popup/popup-data";
import { makeMagnetTorrent, makeWebUISettings } from "../helpers/fixtures";
import { callArgs } from "../helpers/assert";

function popupData(overrides: Partial<PopupData> = {}): PopupData {
    return {
        torrent: makeMagnetTorrent({ name: "Ubuntu 24.04" }),
        webUiSettings: makeWebUISettings({ id: "w1" }),
        supports: { label: true, directory: true, paused: true },
        initial: { label: "movies", directory: "/data", paused: false },
        auto: { label: false, directory: false },
        labelOptions: ["movies", "tv"],
        directoryOptions: ["/data", "/other"],
        ...overrides,
    };
}

beforeEach(() => {
    loadPopupData.mockReset();
    submitTorrent.mockReset();
    submitTorrent.mockResolvedValue(undefined);
    vi.spyOn(window, "close").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/popup.html");
});

describe("mode routing", () => {
    it("renders the buffered-torrent form when no mode is given", async () => {
        loadPopupData.mockResolvedValue(null);
        render(<Home />);

        expect(await screen.findByText("Nothing to add")).toBeInTheDocument();
    });

    it("renders the WebUI picker when mode=picker", () => {
        window.history.replaceState(null, "", "/popup.html?mode=picker");
        render(<Home />);

        expect(screen.getByText("WebUI picker view")).toBeInTheDocument();
        expect(loadPopupData).not.toHaveBeenCalled();
    });

    it("renders the page links view when mode=links", () => {
        window.history.replaceState(null, "", "/popup.html?mode=links");
        render(<Home />);

        expect(screen.getByText("Page links view")).toBeInTheDocument();
        expect(loadPopupData).not.toHaveBeenCalled();
    });
});

describe("popup states", () => {
    it("shows a loading state until the torrent resolves", async () => {
        let resolve: (data: PopupData) => void = () => undefined;
        loadPopupData.mockReturnValue(new Promise<PopupData>(r => { resolve = r; }));

        render(<Home />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();

        resolve(popupData());
        expect(await screen.findByRole("button", { name: "Add Torrent" })).toBeInTheDocument();
    });

    it("says so when nothing is waiting to be added", async () => {
        loadPopupData.mockResolvedValue(null);

        render(<Home />);

        expect(await screen.findByText("Nothing to add")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add Torrent" })).not.toBeInTheDocument();
    });

    it("reports a load failure instead of rendering an empty form", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        loadPopupData.mockRejectedValue(new Error("database is gone"));

        render(<Home />);

        expect(await screen.findByText("Could not load the torrent")).toBeInTheDocument();
        expect(screen.getByText("database is gone")).toBeInTheDocument();
    });

    it("shows the torrent name once loaded", async () => {
        loadPopupData.mockResolvedValue(popupData());

        render(<Home />);

        expect(await screen.findByText("Ubuntu 24.04")).toBeInTheDocument();
    });

    it("does not show placeholder label options before the real ones arrive", async () => {
        let resolve: (data: PopupData) => void = () => undefined;
        loadPopupData.mockReturnValue(new Promise<PopupData>(r => { resolve = r; }));

        render(<Home />);
        // The old popup rendered a hardcoded ['Movies', 'TV Shows', ...] list.
        expect(screen.queryByText("TV Shows")).not.toBeInTheDocument();

        resolve(popupData());
        await screen.findByRole("button", { name: "Add Torrent" });
    });
});

describe("control visibility", () => {
    it("hides the controls the client does not support", async () => {
        loadPopupData.mockResolvedValue(popupData({
            supports: { label: false, directory: true, paused: false },
        }));

        render(<Home />);
        await screen.findByRole("button", { name: "Add Torrent" });

        expect(screen.queryByText("Label")).not.toBeInTheDocument();
        expect(screen.getByText("Directory")).toBeInTheDocument();
        expect(screen.queryByText("Start Paused")).not.toBeInTheDocument();
    });
});

describe("submitting", () => {
    it("sends the loaded values and closes the popup", async () => {
        loadPopupData.mockResolvedValue(popupData());
        render(<Home />);

        await userEvent.click(await screen.findByRole("button", { name: "Add Torrent" }));

        await waitFor(() => expect(submitTorrent).toHaveBeenCalled());
        const request = callArgs(submitTorrent, 0)[0];
        expect(request.webUiId).toBe("w1");
        expect(request.label).toBe("movies");
        expect(request.directory).toBe("/data");
        expect(window.close).toHaveBeenCalled();
    });

    it("moves the chosen value to the front so it is offered first next time", async () => {
        loadPopupData.mockResolvedValue(popupData({
            initial: { label: "tv", directory: "/other", paused: false },
        }));
        render(<Home />);

        await userEvent.click(await screen.findByRole("button", { name: "Add Torrent" }));

        await waitFor(() => expect(submitTorrent).toHaveBeenCalled());
        const request = callArgs(submitTorrent, 0)[0];
        expect(request.labelOptions).toEqual(["tv", "movies"]);
        expect(request.directoryOptions).toEqual(["/other", "/data"]);
    });

    it("keeps the popup open and shows the reason when adding fails", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        loadPopupData.mockResolvedValue(popupData());
        submitTorrent.mockRejectedValue(new Error("client refused the torrent"));
        render(<Home />);

        await userEvent.click(await screen.findByRole("button", { name: "Add Torrent" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("client refused the torrent");
        expect(window.close).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Add Torrent" })).toBeEnabled();
    });

    it("disables the button while the add is in flight", async () => {
        loadPopupData.mockResolvedValue(popupData());
        let finish: () => void = () => undefined;
        submitTorrent.mockReturnValue(new Promise<void>(r => { finish = r; }));
        render(<Home />);

        await userEvent.click(await screen.findByRole("button", { name: "Add Torrent" }));

        expect(await screen.findByRole("button", { name: "Adding…" })).toBeDisabled();
        finish();
    });

    it("does not submit twice when the button is clicked repeatedly", async () => {
        loadPopupData.mockResolvedValue(popupData());
        submitTorrent.mockReturnValue(new Promise<void>(() => undefined));
        render(<Home />);

        const button = await screen.findByRole("button", { name: "Add Torrent" });
        await userEvent.click(button);
        await userEvent.click(screen.getByRole("button", { name: "Adding…" }));

        expect(submitTorrent).toHaveBeenCalledTimes(1);
    });
});
