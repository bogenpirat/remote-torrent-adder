import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function run(script: string, args: string[] = []) {
    return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

describe("generate-update-manifest CLI", () => {
    const script = "scripts/generate-update-manifest.mjs";

    it.each(["", "abc", "1.2", "1.2.3.4", "1.2.3-beta", "v1.2"])(
        "refuses to write updates.json for %o",
        version => {
            const result = run(script, version ? [version] : []);
            expect(result.status).not.toBe(0);
            expect(result.stderr).toMatch(/Usage:/);
        }
    );
});

describe("build-unlisted guard", () => {
    let sandbox: string;

    beforeAll(() => {
        sandbox = mkdtempSync(path.join(os.tmpdir(), "rta-guard-"));
        cpSync("scripts", path.join(sandbox, "scripts"), { recursive: true });
    });

    afterAll(() => {
        rmSync(sandbox, { recursive: true, force: true });
    });

    it("fails fast when the production Firefox bundle is missing", () => {
        const result = run(path.join(sandbox, "scripts", "build-unlisted.mjs"));
        expect(result.status).not.toBe(0);
        expect(result.stderr).toMatch(/Missing dist-prod[\\/]firefox/);
        expect(result.stderr).toMatch(/build:firefox:prod:run/);
    });
});
