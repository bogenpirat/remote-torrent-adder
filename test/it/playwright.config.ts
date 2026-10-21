import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "**/*.it.spec.ts",
    globalSetup: "./global-setup.ts",
    outputDir: "../../test-results/it",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: [["list"]],
    use: {
        trace: "retain-on-failure",
    },
});
