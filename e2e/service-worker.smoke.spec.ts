import { test, expect } from "./fixtures/extension";
import { makeSettings, makeWebUISettings } from "./fixtures/settings";
import { Client } from "../src/models/clients";

test.describe("service worker", () => {
    test("boots on a fresh profile and persists default settings", async ({ extension, logs }) => {
        await logs.waitForQuiet();

        const stored = await extension.readSettings();
        expect(stored, "the worker should have written defaults to storage").toBeTruthy();
        expect(JSON.parse(stored!)).toMatchObject({
            notificationsEnabled: true,
            linkCatchingEnabled: true,
            webuiSettings: [],
        });

        expect(await extension.sessionRules()).toEqual([]);

        await extension.watchContextMenus();
        await extension.provokeSettingsChange();
        await logs.waitForQuiet();
        expect(await extension.contextMenuIds()).toEqual(["server-main"]);

        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("registers one CORS session rule per configured WebUI after a browser restart", async ({ extension, logs }) => {
        await extension.seedSettings(
            makeSettings([
                makeWebUISettings({ id: "webui-1", name: "First", host: "127.0.0.1", port: 8080 }),
                makeWebUISettings({ id: "webui-2", name: "Second", host: "10.0.0.5", port: 9091 }),
            ]),
        );
        logs.clear();
        await extension.restart();
        await logs.waitForQuiet();

        const rules = await extension.sessionRules();
        expect(rules.map(rule => rule.condition.urlFilter)).toEqual([
            "|http://127.0.0.1:8080*",
            "|http://10.0.0.5:9091*",
        ]);
        expect(rules[0]!.action.requestHeaders).toEqual([{ header: "origin", operation: "remove" }]);

        await extension.watchContextMenus();
        await extension.provokeSettingsChange();
        await logs.waitForQuiet();
        expect(await extension.contextMenuIds()).toEqual([
            "server-main",
            "server-0",
            "server-1",
            "sendall-separator",
            "server-all",
        ]);

        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("recovers from corrupt stored settings", async ({ extension, logs }) => {
        await extension.writeRawSettings("{ this is not json");
        logs.clear();
        await extension.restart();
        await logs.waitForQuiet();

        const stored = await extension.readSettings();
        expect(JSON.parse(stored!)).toMatchObject({ webuiSettings: [] });

        const problems = logs.unexpectedProblems([/Failed to deserialize settings/]);
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("survives a half-configured WebUI that has no host yet", async ({ extension, logs }) => {
        await extension.seedSettings(
            makeSettings([
                makeWebUISettings({ id: "draft", client: Client.QBittorrentWebUI, host: "", port: 80 }),
                makeWebUISettings({ id: "valid", host: "127.0.0.1", port: 8080 }),
            ]),
        );
        logs.clear();
        await extension.restart();
        await logs.waitForQuiet();

        const rules = await extension.sessionRules();
        expect(
            rules.map(rule => rule.condition.urlFilter),
            "the blank-host draft must be skipped without taking its valid sibling down with it",
        ).toEqual(["|http://127.0.0.1:8080*"]);

        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });
});
