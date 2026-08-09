import { access } from "node:fs/promises";
import { join } from "node:path";
import { EXTENSION_DIR } from "./fixtures/paths";

export default async function globalSetup(): Promise<void> {
    try {
        await access(join(EXTENSION_DIR, "manifest.json"));
    } catch {
        throw new Error(
            `No built extension at ${EXTENSION_DIR}. Run \`npm run build\` before \`npm run test:e2e\`.`
        );
    }
}
