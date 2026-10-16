import { test, expect, type ExtensionHarness } from "./fixtures/extension";
import { type ConsoleCollector } from "./fixtures/console-collector";
import { expectNoProblems } from "./fixtures/expectations";
import { makeSettings, makeTwoWebUiSettings, makeWebUISettings } from "./fixtures/settings";
import { Client } from "../src/models/clients";

const MULTI_WEBUI_MENU_IDS = ["server-main", "server-0", "server-1", "sendall-separator", "server-all"];

interface Session {
    extension: ExtensionHarness;
    logs: ConsoleCollector;
}

async function restartQuietly({ extension, logs }: Session): Promise<void> {
    logs.clear();
    await extension.restart();
    await logs.waitForQuiet();
}

async function contextMenuIdsAfterRebuild({ extension, logs }: Session): Promise<string[]> {
    await extension.recorder.watchContextMenus();
    await extension.settings.provokeChange();
    await logs.waitForQuiet();
    return extension.recorder.contextMenuIds();
}

test.describe("service worker", () => {
    test("boots on a fresh profile and persists default settings", async ({ extension, logs }) => {
        await logs.waitForQuiet();

        const stored = await extension.settings.read();
        expect(stored, "the worker should have written defaults to storage").toBeTruthy();
        expect(JSON.parse(stored!)).toMatchObject({
            notificationsEnabled: true,
            linkCatchingEnabled: true,
            webuiSettings: [],
        });
        expect(await extension.sessionRules()).toEqual([]);
        expect(await contextMenuIdsAfterRebuild({ extension, logs })).toEqual(["server-main"]);

        await expectNoProblems(logs);
    });

    test("registers one CORS session rule per configured WebUI after a browser restart", async ({ extension, logs }) => {
        await extension.settings.seed(makeTwoWebUiSettings());
        await restartQuietly({ extension, logs });

        const rules = await extension.sessionRules();
        expect(rules.map(rule => rule.condition.urlFilter)).toEqual(["|http://127.0.0.1:8080*", "|http://10.0.0.5:9091*"]);
        expect(rules[0]!.action.requestHeaders).toEqual([{ header: "origin", operation: "remove" }]);
        expect(await contextMenuIdsAfterRebuild({ extension, logs })).toEqual(MULTI_WEBUI_MENU_IDS);

        await expectNoProblems(logs);
    });

    test("recovers from corrupt stored settings", async ({ extension, logs }) => {
        await extension.settings.writeRaw("{ this is not json");
        await restartQuietly({ extension, logs });

        const stored = await extension.settings.read();
        expect(JSON.parse(stored!)).toMatchObject({ webuiSettings: [] });

        await expectNoProblems(logs, [/Failed to deserialize settings/]);
    });

    test("survives a half-configured WebUI that has no host yet", async ({ extension, logs }) => {
        await extension.settings.seed(
            makeSettings([
                makeWebUISettings({ id: "draft", client: Client.QBittorrentWebUI, host: "", port: 80 }),
                makeWebUISettings({ id: "valid", host: "127.0.0.1", port: 8080 }),
            ]),
        );
        await restartQuietly({ extension, logs });

        const rules = await extension.sessionRules();
        expect(
            rules.map(rule => rule.condition.urlFilter),
            "the blank-host draft must be skipped without taking its valid sibling down with it",
        ).toEqual(["|http://127.0.0.1:8080*"]);

        await expectNoProblems(logs);
    });
});
