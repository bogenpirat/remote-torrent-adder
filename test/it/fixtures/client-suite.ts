import { test, expect, type ExtensionHarness } from "../../../e2e/fixtures/extension";
import { type ConsoleCollector } from "../../../e2e/fixtures/console-collector";
import { WebUIFactory } from "../../../src/models/clients";
import { type TorrentUploadConfig } from "../../../src/models/torrent";
import { type WebUISettings } from "../../../src/models/webui";
import { addViaExtension, configureExtension, setLabelViaExtension, testConnectionViaExtension, webUiSettingsFor } from "./add-via-extension";
import { type ClientProbe, type TorrentState } from "./client-probe";
import { composeDown, composeUp, keepContainers, waitFor } from "./docker";
import { randomMagnet, TorrentServer, type GeneratedTorrent } from "./torrents";

export interface ClientSuite {
    torrents: () => TorrentServer;
    addAndFind: (
        extension: ExtensionHarness,
        logs: ConsoleCollector,
        options?: { config?: TorrentUploadConfig; settings?: Partial<WebUISettings>; torrent?: GeneratedTorrent },
    ) => Promise<TorrentState>;
}

export function defineClientSuite(probe: ClientProbe): ClientSuite {
    const webUi = WebUIFactory.createWebUI(webUiSettingsFor(probe))!;
    let torrentServer: TorrentServer;

    test.beforeAll(async () => {
        test.setTimeout(240_000);
        await composeUp(probe.profile);
        await probe.prepare();
        torrentServer = new TorrentServer();
        await torrentServer.start();
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        await torrentServer?.stop();
        if (!keepContainers) {
            await composeDown(probe.profile);
        }
    });

    const addAndFind: ClientSuite["addAndFind"] = async (extension, logs, options = {}) => {
        const torrent = options.torrent ?? torrentServer.createTorrent();
        await configureExtension(extension, webUiSettingsFor(probe, options.settings));

        const notification = await addViaExtension(extension, torrent.url, options.config);
        expect(notification.title, notification.message).toBe("Torrent added successfully");

        const state = await waitFor(`${torrent.name} to show up in ${probe.profile}`, () => probe.find(torrent.infoHash), {
            timeoutMs: 30_000,
        });
        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
        return state;
    };

    test("adds a .torrent file without options", async ({ extension, logs }) => {
        const state = await addAndFind(extension, logs);
        expect(state.paused).toBe(false);
    });

    test("adds a magnet link without options", async ({ extension, logs }) => {
        test.skip(probe.addsUnresolvedMagnets === false, `${probe.profile} only adds a magnet once it has resolved its metadata`);
        await addAndFind(extension, logs, { torrent: randomMagnet() });
    });

    test("applies the label", async ({ extension, logs }) => {
        test.skip(!webUi.isLabelSupported, "labels are not supported");
        const state = await addAndFind(extension, logs, { config: { label: probe.label } });
        expect(state.label).toBe(probe.label);
    });

    test("sets the label after adding", async ({ extension, logs }) => {
        test.skip(!webUi.isLabelSupported, "labels are not supported");
        const torrent = torrentServer.createTorrent();
        await addAndFind(extension, logs, { torrent });

        expect(await setLabelViaExtension(extension, torrent.infoHash, probe.label)).toEqual({});

        const state = await waitFor(`${torrent.name} to be labelled in ${probe.profile}`, async () => {
            const current = await probe.find(torrent.infoHash);
            return current?.label === probe.label ? current : null;
        }, { timeoutMs: 15_000 });
        expect(state.label).toBe(probe.label);
    });

    test("applies the directory", async ({ extension, logs }) => {
        test.skip(!webUi.isDirSupported, "directories are not supported");
        const state = await addAndFind(extension, logs, { config: { dir: probe.dir } });
        expect(state.dir).toBe(probe.dir);
    });

    test("adds paused", async ({ extension, logs }) => {
        test.skip(!webUi.isAddPausedSupported, "adding paused is not supported");
        const state = await addAndFind(extension, logs, { config: { addPaused: true } });
        expect(state.paused).toBe(true);
    });

    test("applies label, directory and paused together on a magnet link", async ({ extension, logs }) => {
        test.skip(probe.addsUnresolvedMagnets === false, `${probe.profile} only adds a magnet once it has resolved its metadata`);
        const config: TorrentUploadConfig = {
            label: webUi.isLabelSupported ? probe.label : undefined,
            dir: webUi.isDirSupported ? probe.dir : undefined,
            addPaused: webUi.isAddPausedSupported ? true : undefined,
        };
        const state = await addAndFind(extension, logs, { torrent: randomMagnet(), config });
        expectState(state, config);
    });

    test("falls back to the WebUI defaults when no options are sent", async ({ extension, logs }) => {
        const state = await addAndFind(extension, logs, {
            settings: { defaultLabel: probe.label, defaultDir: probe.dir, addPaused: true },
        });
        expectState(state, {
            label: webUi.isLabelSupported ? probe.label : undefined,
            dir: webUi.isDirSupported ? probe.dir : undefined,
            addPaused: webUi.isAddPausedSupported ? true : undefined,
        });
    });

    test("reports a failure for wrong credentials", async ({ extension }) => {
        await configureExtension(extension, webUiSettingsFor(probe, { password: "definitely-wrong" }));
        const notification = await addViaExtension(extension, torrentServer.createTorrent().url);
        expect(notification.title).toBe("Torrent adding failed");
    });

    test("the connection test reaches and authenticates", async ({ extension }) => {
        test.skip(!webUi.isConnectionTestSupported, "connection test is not supported");
        const result = await testConnectionViaExtension(extension, webUiSettingsFor(probe));
        expect(result.reachable, result.message).toBe(true);
        expect(result.authenticated, result.message).not.toBe(false);
    });

    return { torrents: () => torrentServer, addAndFind };
}

function expectState(state: TorrentState, config: TorrentUploadConfig): void {
    if (config.label !== undefined) {
        expect(state.label).toBe(config.label);
    }
    if (config.dir !== undefined) {
        expect(state.dir).toBe(config.dir);
    }
    if (config.addPaused !== undefined) {
        expect(state.paused).toBe(config.addPaused);
    }
}
