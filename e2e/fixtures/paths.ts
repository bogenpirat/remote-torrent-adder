import { fileURLToPath } from "node:url";

export const EXTENSION_DIR = fileURLToPath(new URL("../../dist/chrome/", import.meta.url)).replace(/[\\/]$/, "");
