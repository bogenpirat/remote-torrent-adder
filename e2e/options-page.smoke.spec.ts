import { test, expect } from "./fixtures/extension";
import { makeSettings, makeWebUISettings } from "./fixtures/settings";

const TAB_TITLES = [
    "WebUIs",
    "Icon Click",
    "Notifications",
    "Link Catching",
    "Import/Export Settings",
    "About",
];

test.describe("options page", () => {
    test("renders every tab on a profile with no WebUIs", async ({ extension, logs }) => {
        const page = await extension.openPage(extension.url("options/options.html"));

        await expect(page.getByRole("heading", { name: "Remote Torrent Adder Options" })).toBeVisible();
        await expect(page.getByText("No WebUIs yet. Click + to add one.")).toBeVisible();

        for (const title of TAB_TITLES) {
            await page.getByRole("tab", { name: title, exact: true }).click();
            await expect(page.getByRole("tabpanel")).toBeVisible();
            await expect(page.getByRole("tabpanel")).not.toHaveText("Loading...");
        }

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("shows a configured WebUI", async ({ extension, logs }) => {
        await extension.seedSettings(
            makeSettings([makeWebUISettings({ id: "webui-1", name: "Living room box", host: "127.0.0.1", port: 8080 })]),
        );

        const page = await extension.openPage(extension.url("options/options.html"));
        await expect(page.getByText("Living room box")).toBeVisible();
        await expect(page.getByRole("button", { name: "Reorder Living room box" })).toBeVisible();

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("adding a draft WebUI does not break the worker's CORS rules", async ({ extension, logs }) => {
        const page = await extension.openPage(extension.url("options/options.html"));
        await expect(page.getByText("No WebUIs yet. Click + to add one.")).toBeVisible();

        await page.getByRole("button", { name: "Add new WebUI" }).click();
        await expect(page.getByRole("button", { name: "Reorder Unnamed WebUI" })).toBeVisible();
        await logs.waitForQuiet();

        expect(
            await extension.sessionRules(),
            "a draft row has no host yet, so it must not produce a rule",
        ).toEqual([]);

        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });
});
