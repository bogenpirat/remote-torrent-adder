import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "**/*.it.spec.ts",
    globalSetup: "./global-setup.ts",
    outputDir: "../../test-results/it",
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: process.env.CI
        ? [["list"], ["html", { outputFolder: "../../playwright-report/it", open: "never" }]]
        : [["list"]],
    use: {
        trace: "retain-on-failure",
    },
});
