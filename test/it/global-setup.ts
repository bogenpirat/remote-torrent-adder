import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { EXTENSION_DIR } from "../../e2e/fixtures/paths";

export default async function globalSetup(): Promise<void> {
    try {
        await access(join(EXTENSION_DIR, "manifest.json"));
    } catch {
        throw new Error(`No built extension at ${EXTENSION_DIR}. Run \`npm run build\` before \`npm run test:it\`.`);
    }
    try {
        await promisify(execFile)("docker", ["compose", "version"]);
    } catch {
        throw new Error("`docker compose` is not available. The integration tests need a running Docker engine.");
    }
}
