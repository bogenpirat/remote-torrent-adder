import { test, expect } from "./fixtures/extension";
import { makeSettings, makeWebUISettings } from "./fixtures/settings";

test.describe("popup", () => {
    test("says there is nothing to add when no torrent is buffered", async ({ extension, logs }) => {
        const page = await extension.openPage(extension.url("popup/popup.html"));

        await expect(page.getByText("Nothing to add")).toBeVisible();
        await expect(page.getByText("No torrent is waiting to be added.")).toBeVisible();

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("picker reports an unconfigured profile", async ({ extension, logs }) => {
        const page = await extension.openPage(extension.url("popup/popup.html?mode=picker"));

        await expect(page.getByText("No WebUIs configured")).toBeVisible();

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("picker lists every configured WebUI", async ({ extension, logs }) => {
        await extension.seedSettings(
            makeSettings([
                makeWebUISettings({ id: "webui-1", name: "First", host: "127.0.0.1", port: 8080 }),
                makeWebUISettings({ id: "webui-2", name: "Second", host: "10.0.0.5", port: 9091 }),
            ]),
        );

        const page = await extension.openPage(extension.url("popup/popup.html?mode=picker"));

        await expect(page.getByRole("heading", { name: "Choose a WebUI" })).toBeVisible();
        await expect(page.getByRole("button", { name: /First/ })).toBeVisible();
        await expect(page.getByRole("button", { name: /Second/ })).toBeVisible();
        await expect(page.getByText("http://127.0.0.1:8080/")).toBeVisible();

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("links mode fails gracefully when there is no page to scan", async ({ extension, logs }) => {
        // Opened as a tab rather than as the action popup, the "active tab" is
        // this page itself, so the content-script round-trip cannot succeed.
        const page = await extension.openPage(extension.url("popup/popup.html?mode=links"));

        await expect(page.getByRole("heading", { name: "Could not scan this page" })).toBeVisible();

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems([/Failed loading page links/]);
        expect(problems, logs.report(problems)).toEqual([]);
    });
});
