import { expect, type ExtensionHarness } from "../../../e2e/fixtures/extension";
import { makeSettings, makeWebUISettings } from "../../../e2e/fixtures/settings";
import { type TorrentUploadConfig } from "../../../src/models/torrent";
import { type ConnectionTestResult, type WebUISettings } from "../../../src/models/webui";
import { type ClientProbe } from "./client-probe";

export const WEBUI_ID = "webui-it";

export function webUiSettingsFor(probe: ClientProbe, overrides: Partial<WebUISettings> = {}): WebUISettings {
    return makeWebUISettings({
        id: WEBUI_ID,
        client: probe.client,
        name: `IT ${probe.profile}`,
        host: "127.0.0.1",
        port: probe.port,
        relativePath: probe.relativePath ?? null,
        username: probe.username,
        password: probe.password,
        ...overrides,
    });
}

export async function configureExtension(extension: ExtensionHarness, settings: WebUISettings): Promise<void> {
    await extension.seedSettings(makeSettings([settings], { notificationsEnabled: true, notificationsSoundEnabled: false }));
    await expect.poll(async () => (await extension.sessionRules()).length).toBeGreaterThan(0);
    await extension.watchNotifications();
}

export async function addViaExtension(
    extension: ExtensionHarness,
    url: string,
    config?: TorrentUploadConfig,
): Promise<{ title?: string; message?: string }> {
    const before = (await extension.notifications()).length;
    const page = await extension.openPage(extension.url("options/options.html"));
    await page.evaluate(
        message => chrome.runtime.sendMessage(message),
        { action: "addTorrent", url, webUiId: WEBUI_ID, config },
    );
    await page.close();
    await expect
        .poll(async () => (await extension.notifications()).length, { timeout: 30_000 })
        .toBeGreaterThan(before);
    return (await extension.notifications())[before]!;
}

export async function setLabelViaExtension(
    extension: ExtensionHarness,
    infoHash: string,
    label: string,
): Promise<{ error?: string }> {
    const page = await extension.openPage(extension.url("options/options.html"));
    const response = await page.evaluate(
        message => chrome.runtime.sendMessage(message) as Promise<{ error?: string }>,
        { action: "setTorrentLabel", webUiId: WEBUI_ID, infoHash, torrentName: "IT torrent", label, labels: [label] },
    );
    await page.close();
    return response;
}

export async function testConnectionViaExtension(
    extension: ExtensionHarness,
    settings: WebUISettings,
): Promise<ConnectionTestResult> {
    const page = await extension.openPage(extension.url("options/options.html"));
    const result = await page.evaluate(
        webUiSettings => chrome.runtime.sendMessage({ action: "testConnection", webUiSettings }) as Promise<ConnectionTestResult>,
        settings,
    );
    await page.close();
    return result;
}
