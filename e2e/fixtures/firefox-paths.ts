import { fileURLToPath } from "node:url";

export const FIREFOX_EXTENSION_DIR = fileURLToPath(new URL("../../dist/firefox/", import.meta.url))
    .replace(/[\\/]$/, "");

/** Must match browser_specific_settings.gecko.id in scripts/generate-manifest.mjs. */
export const GECKO_ID = "remote-torrent-adder@bogenpirat";
