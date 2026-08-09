import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    globalSetup: "./global-setup.ts",
    outputDir: "../test-results",
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI
        ? [["list"], ["html", { outputFolder: "../playwright-report", open: "never" }]]
        : [["list"]],
    use: {
        trace: "retain-on-failure",
    },
});
