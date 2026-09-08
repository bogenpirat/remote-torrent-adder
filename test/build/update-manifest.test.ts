import { describe, it, expect } from "vitest";
import { GECKO_UNLISTED } from "../../scripts/generate-manifest.mjs";
import { buildUpdateManifest, xpiAssetUrl } from "../../scripts/generate-update-manifest.mjs";

describe("the self-hosted update manifest", () => {
    it("keys off the unlisted add-on id", () => {
        const manifest = buildUpdateManifest(["2.3.1"]) as Record<string, any>;
        expect(Object.keys(manifest.addons)).toEqual([GECKO_UNLISTED.id]);
    });

    it("points each version at that release's xpi asset", () => {
        const manifest = buildUpdateManifest(["2.3.1"]) as Record<string, any>;
        expect(manifest.addons[GECKO_UNLISTED.id].updates).toEqual([
            {
                version: "2.3.1",
                update_link:
                    "https://github.com/bogenpirat/remote-torrent-adder/releases/download/v2.3.1/remote-torrent-adder-2.3.1.xpi",
            },
        ]);
    });

    it("tags the release with a v-prefix but not the asset filename", () => {
        const url = xpiAssetUrl("2.3.1");
        expect(url).toContain("/download/v2.3.1/");
        expect(url).toContain("remote-torrent-adder-2.3.1.xpi");
    });

    it("serves an empty update list before any xpi has shipped", () => {
        const manifest = buildUpdateManifest([]) as Record<string, any>;
        expect(manifest.addons[GECKO_UNLISTED.id].updates).toEqual([]);
    });
});
