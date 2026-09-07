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
    projects: [
        {
            // Chromium, driven by Playwright with the unpacked dist/chrome loaded.
            name: "chrome",
            testIgnore: "firefox/**",
        },
        {
            // Real Firefox, driven by geckodriver: Playwright cannot install a
            // Firefox add-on, so these specs bring their own harness.
            name: "firefox",
            testMatch: "firefox/**/*.spec.ts",
            timeout: 120_000,
        },
    ],
});
