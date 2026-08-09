import { fileURLToPath } from "node:url";

export const EXTENSION_DIR = fileURLToPath(new URL("../../dist/", import.meta.url)).replace(/[\\/]$/, "");
