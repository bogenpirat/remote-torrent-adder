import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AutoLabelDirTester from "../../../src/options/components/AutoLabelDirTester";
import { type AutoLabelDirSetting } from "../../../src/models/webui";
import { buildBencodedTorrent } from "../../helpers/fixtures";

type TesterProps = React.ComponentProps<typeof AutoLabelDirTester>;

const TRACKER_RULE: AutoLabelDirSetting = { criteria: [{ field: "trackerUrl", value: "tracker\\.org" }], label: "movies", dir: null };
const FILE_RULE: AutoLabelDirSetting = { criteria: [{ field: "filePath", value: "\\.mkv$" }], label: "video", dir: "/video" };
const NAME_RULE: AutoLabelDirSetting = { criteria: [{ field: "torrentName", value: "cool" }], label: "named", dir: null };
const TRACKER_PARAMETER = "&tr=http%3A%2F%2Ftracker.org%2Fannounce";
const MAGNET = `magnet:?xt=urn:btih:abc&dn=Cool+Movie${TRACKER_PARAMETER}`;
const UNNAMED_MAGNET = `magnet:?xt=urn:btih:abc${TRACKER_PARAMETER}`;

function renderTester(settings: AutoLabelDirSetting[] = [TRACKER_RULE], overrides: Partial<TesterProps> = {}): HTMLElement {
    const props: TesterProps = { settings, defaultLabel: "fallback", defaultDir: null, showLabel: true, showDir: true, ...overrides };
    return render(<AutoLabelDirTester {...props} />).container;
}

function magnetInput(): HTMLElement {
    return screen.getByPlaceholderText("…or paste a magnet link");
}

function testMagnet(link: string): void {
    fireEvent.change(magnetInput(), { target: { value: link } });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
}

function chooseFile(container: HTMLElement, file: File): void {
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
}

function torrentFile(): File {
    const bencoded = buildBencodedTorrent({
        announce: "http://tracker.org/announce",
        info: { name: "Show", "piece length": 16384, pieces: "", files: [{ length: 1, path: ["s01", "e01.mkv"] }] },
    });
    return new File([Uint8Array.from(bencoded, character => character.charCodeAt(0))], "show.torrent");
}

describe("AutoLabelDirTester with a magnet link", () => {
    it("rejects text that is not a magnet link", () => {
        const container = renderTester();

        testMagnet("https://example.com/file.torrent");

        expect(container).toHaveTextContent("That doesn't look like a magnet link.");
        expect(container).not.toHaveTextContent("Rule 1");
    });

    it("names the applied rule and where the label came from", () => {
        const container = renderTester();

        testMagnet(`  ${MAGNET} `);

        expect(container).toHaveTextContent("Cool Movie");
        expect(container).toHaveTextContent('Rule 1✅ applied → label "movies", dir (none)');
        expect(container).toHaveTextContent("Labelmoviesfrom rule 1");
        expect(container).toHaveTextContent("Directory(none)");
        expect(container).toHaveTextContent("Tracker URLtracker\\.org✅ http://tracker.org/announce");
    });

    it("tests the link when Enter is pressed", () => {
        const container = renderTester();
        fireEvent.change(magnetInput(), { target: { value: MAGNET } });

        fireEvent.keyDown(magnetInput(), { key: "Enter" });

        expect(container).toHaveTextContent("Rule 1");
    });

    it("falls back to the default label when no rule matches", () => {
        const container = renderTester([{ ...TRACKER_RULE, criteria: [{ field: "trackerUrl", value: "elsewhere" }] }]);

        testMagnet(MAGNET);

        expect(container).toHaveTextContent("Rule 1❌ does not match");
        expect(container).toHaveTextContent("Tracker URLelsewhere❌ no match");
        expect(container).toHaveTextContent("Labelfallbackfrom the default label");
    });

    it("explains a later rule that matches but does not win", () => {
        const container = renderTester([TRACKER_RULE, NAME_RULE]);

        testMagnet(MAGNET);

        expect(container).toHaveTextContent("Rule 2✅ matches, but rule 1 wins");
    });

    it("explains rules that can never match", () => {
        const invalidRule: AutoLabelDirSetting = { criteria: [{ field: "trackerUrl", value: "(unclosed" }], label: null, dir: null };
        const container = renderTester([{ criteria: [], label: null, dir: null }, invalidRule]);

        testMagnet(MAGNET);

        expect(container).toHaveTextContent("No criteria — a rule without criteria never matches.");
        expect(container).toHaveTextContent("❌ invalid regular expression");
    });

    it("warns that file criteria cannot match a magnet link", () => {
        const container = renderTester([FILE_RULE]);

        testMagnet(MAGNET);

        expect(container).toHaveTextContent("file criteria can never match it. Torrent name and tracker criteria still work.");
    });

    it("warns that name criteria cannot match a torrent without a declared name", () => {
        const container = renderTester([NAME_RULE]);

        testMagnet(UNNAMED_MAGNET);

        expect(container).toHaveTextContent("This torrent declares no name of its own, so torrent name criteria can never match it");
    });

    it("leaves out what the client does not support", () => {
        const container = renderTester([TRACKER_RULE], { showLabel: false });

        testMagnet(MAGNET);

        expect(container).toHaveTextContent("Rule 1✅ applied → dir (none)");
        expect(container).not.toHaveTextContent("Labelmovies");
    });
});

describe("AutoLabelDirTester result panel", () => {
    it("forgets the tested torrent when cleared", () => {
        const container = renderTester();
        testMagnet(MAGNET);

        fireEvent.click(screen.getByRole("button", { name: "Clear" }));

        expect(container).not.toHaveTextContent("Rule 1");
        expect(magnetInput()).toHaveValue("");
    });

    it("lists trackers and files on demand", () => {
        const container = renderTester();
        testMagnet(MAGNET);
        expect(container).not.toHaveTextContent("Trackers");

        fireEvent.click(screen.getByRole("button", { name: "▸ Torrent contents (1 tracker, 0 files)" }));

        expect(container).toHaveTextContent("Trackershttp://tracker.org/announceFilesNone.");
    });
});

describe("AutoLabelDirTester with a torrent file", () => {
    it("evaluates the files and trackers of a chosen torrent", async () => {
        const container = renderTester([FILE_RULE]);

        chooseFile(container, torrentFile());

        await waitFor(() => expect(container).toHaveTextContent('Rule 1✅ applied → label "video", dir "/video"'));
        expect(container).toHaveTextContent("File in torrent\\.mkv$✅ s01/e01.mkv");
        expect(container).toHaveTextContent("Directory/videofrom rule 1");
    });

    it("reports a file that is not a torrent", async () => {
        const container = renderTester();
        testMagnet(MAGNET);

        chooseFile(container, new File(["not bencoded"], "notes.txt"));

        await waitFor(() => expect(container).not.toHaveTextContent("Rule 1"));
        expect(container.querySelector('div[style*="color"]:last-child')).not.toBeNull();
    });

    it("refuses a file above the size limit", () => {
        const container = renderTester();
        const hugeFile = new File(["x"], "huge.torrent");
        Object.defineProperty(hugeFile, "size", { value: 10 * 1024 * 1024 + 1 });

        chooseFile(container, hugeFile);

        expect(container).toHaveTextContent("That file is too large (max 10 MB).");
    });
});
