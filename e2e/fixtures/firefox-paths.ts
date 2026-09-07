import { fileURLToPath } from "node:url";

export const FIREFOX_EXTENSION_DIR = fileURLToPath(new URL("../../dist/firefox/", import.meta.url))
    .replace(/[\\/]$/, "");

export const GECKO_ID = "remote-torrent-adder@bogenpirat";
