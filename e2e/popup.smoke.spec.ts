import { type Locator, type Page } from "@playwright/test";
import { test, expect, type ExtensionHarness } from "./fixtures/extension";
import { type ConsoleCollector } from "./fixtures/console-collector";
import { makeSettings, makeWebUISettings } from "./fixtures/settings";

const INFO_HASH = "0123456789abcdef0123456789abcdef01234567";
const SLOW_PRESS_MS = 500;

async function expectNoUnexpectedProblems(logs: ConsoleCollector, expected: RegExp[] = []): Promise<void> {
    await logs.waitForQuiet();
    const problems = logs.unexpectedProblems(expected);
    expect(problems, logs.report(problems)).toEqual([]);
}

async function openLabelView(extension: ExtensionHarness, labels: string[]): Promise<Page> {
    const webUi = makeWebUISettings({ id: "webui-1", name: "First", host: "127.0.0.1", port: 8080, labels });
    await extension.seedSettings(makeSettings([webUi]));
    const query = new URLSearchParams({ mode: "label", webUiId: "webui-1", infoHash: INFO_HASH });
    return extension.openPage(extension.url(`popup/popup.html?${query}`));
}

async function pressSlowly(page: Page, target: Locator): Promise<void> {
    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(SLOW_PRESS_MS);
    await page.mouse.up();
}

test.describe("popup", () => {
    test("says there is nothing to add when no torrent is buffered", async ({ extension, logs }) => {
        const page = await extension.openPage(extension.url("popup/popup.html"));

        await expect(page.getByText("Nothing to add")).toBeVisible();
        await expect(page.getByText("No torrent is waiting to be added.")).toBeVisible();

        await expectNoUnexpectedProblems(logs);
    });

    test("picker reports an unconfigured profile", async ({ extension, logs }) => {
        const page = await extension.openPage(extension.url("popup/popup.html?mode=picker"));

        await expect(page.getByText("No WebUIs configured")).toBeVisible();

        await expectNoUnexpectedProblems(logs);
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

        await expectNoUnexpectedProblems(logs);
    });

    test("a dropdown option can be chosen with a slow mouse press", async ({ extension, logs }) => {
        const page = await openLabelView(extension, ["movies", "tv"]);
        const input = page.getByRole("combobox", { name: "Label" });
        await expect(input).toHaveValue("movies");

        await input.click();
        await pressSlowly(page, page.getByRole("option", { name: "tv" }));

        await expect(input).toHaveValue("tv");
        await expect(page.getByRole("listbox")).toBeHidden();

        await expectNoUnexpectedProblems(logs);
    });

    test("links mode fails gracefully when there is no page to scan", async ({ extension, logs }) => {
        // Opened as a tab rather than as the action popup, the "active tab" is
        // this page itself, so the content-script round-trip cannot succeed.
        const page = await extension.openPage(extension.url("popup/popup.html?mode=links"));

        await expect(page.getByRole("heading", { name: "Could not scan this page" })).toBeVisible();

        await expectNoUnexpectedProblems(logs, [/Failed loading page links/]);
    });
});
