import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import WebUIsPage from "../../../src/options/pages/WebUIsPage";
import { Client } from "../../../src/models/clients";
import { GetSettingsMessage, TestConnectionMessage } from "../../../src/models/messages";
import { type ConnectionTestResult, type WebUISettings } from "../../../src/models/webui";
import { serializeSettings } from "../../../src/util/serializer";
import { getDefaultSettings } from "../../../src/util/settings-defaults";
import { makeWebUISettings } from "../../helpers/fixtures";
import { lastSavedSettings, renderWithSettings, respondWithSettings, sentMessages } from "../../helpers/options";

const ALPHA = makeWebUISettings({ id: "a", name: "Alpha", host: "alpha.example", port: 8080 });
const BETA = makeWebUISettings({ id: "b", name: "Beta", client: Client.TransmissionWebUI });
const REACHABLE: ConnectionTestResult = { reachable: true, authenticated: true, httpResponseCode: 200, message: "Reachable & authenticated" };

async function renderPage(webuiSettings: WebUISettings[] = [ALPHA, BETA]): Promise<void> {
    respondWithSettings({ webuiSettings });
    renderWithSettings(<WebUIsPage />);
    await screen.findByRole("button", { name: "Add new WebUI" });
}

/** Answers the settings request as usual and a connection test with the given outcome. */
function respondToConnectionTest(outcome: () => Promise<ConnectionTestResult>, webuiSettings: WebUISettings[] = [ALPHA]): void {
    const settings = { ...getDefaultSettings(), webuiSettings };
    (chrome.runtime.sendMessage as any).mockImplementation((message: any) => {
        if (message.action === GetSettingsMessage.action) return Promise.resolve(serializeSettings(settings));
        return message.action === TestConnectionMessage.action ? outcome() : Promise.resolve();
    });
}

async function testConnection(outcome: () => Promise<ConnectionTestResult>): Promise<HTMLElement> {
    respondToConnectionTest(outcome);
    renderWithSettings(<WebUIsPage />);
    const general = await screen.findByRole("region", { name: "General" });
    fireEvent.click(within(general).getByRole("button", { name: "Test connection" }));
    return general;
}

function savedWebUIs(): WebUISettings[] | undefined {
    return lastSavedSettings()?.webuiSettings;
}

function savedIds(): string[] | undefined {
    return savedWebUIs()?.map(webUi => webUi.id);
}

function fieldLabelled(labelText: string): HTMLInputElement {
    return screen.getByText(labelText).parentElement!.querySelector("input")!;
}

function changeField(labelText: string, value: string): void {
    fireEvent.change(fieldLabelled(labelText), { target: { value } });
}

function reorderHandle(name: string): HTMLElement {
    return screen.getByRole("button", { name: `Reorder ${name}` });
}

function listItem(name: string): HTMLElement {
    return reorderHandle(name).parentElement!.parentElement!;
}

describe("WebUIsPage list", () => {
    it("explains how to start when nothing is configured", async () => {
        await renderPage([]);

        expect(screen.getByText("No WebUIs yet. Click + to add one.")).toBeInTheDocument();
        expect(screen.getByText("Select a WebUI on the left, or click + to add a new one.")).toBeInTheDocument();
    });

    it("adds a draft without a client and selects it", async () => {
        await renderPage();

        fireEvent.click(screen.getByRole("button", { name: "Add new WebUI" }));

        expect(savedWebUIs()).toHaveLength(3);
        expect(savedWebUIs()![2]).toMatchObject({ client: "", name: "", host: "", port: null, labels: [], autoLabelDirSettings: [] });
        expect(screen.getByText("Select a client type above to configure this WebUI.")).toBeInTheDocument();
        expect(screen.getByText("No client selected")).toBeInTheDocument();
    });

    it("opens on the primary WebUI and marks it as such", async () => {
        await renderPage();

        expect(within(listItem("Alpha")).getByText("Primary")).toBeInTheDocument();
        expect(within(listItem("Beta")).queryByText("Primary")).toBeNull();
        expect(screen.queryByRole("button", { name: "Promote to Primary" })).toBeNull();
    });

    it("shows the configuration of the WebUI that is clicked", async () => {
        await renderPage();

        fireEvent.click(listItem("Beta"));

        expect(screen.getByRole("region", { name: "Directories" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Promote to Primary" })).toBeInTheDocument();
    });

    it("renames the selected WebUI from the list", async () => {
        await renderPage();

        fireEvent.change(screen.getByPlaceholderText("Unnamed WebUI"), { target: { value: "Seedbox" } });

        expect(savedWebUIs()![0]!.name).toBe("Seedbox");
    });
});

describe("WebUIsPage ordering", () => {
    it("promotes the selected WebUI to the front", async () => {
        await renderPage();
        fireEvent.click(listItem("Beta"));

        fireEvent.click(screen.getByRole("button", { name: "Promote to Primary" }));

        expect(savedIds()).toEqual(["b", "a"]);
    });

    it("moves a WebUI with the arrow keys on its handle", async () => {
        await renderPage();

        fireEvent.keyDown(reorderHandle("Alpha"), { key: "ArrowDown" });

        expect(savedIds()).toEqual(["b", "a"]);
    });

    it("saves nothing when a WebUI cannot move any further", async () => {
        await renderPage();

        fireEvent.keyDown(reorderHandle("Alpha"), { key: "ArrowUp" });

        expect(savedIds()).toBeUndefined();
    });

    it("reorders by dragging one WebUI onto another", async () => {
        await renderPage();
        const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

        fireEvent.dragStart(listItem("Alpha"), { dataTransfer });
        fireEvent.dragOver(listItem("Beta"), { dataTransfer });
        fireEvent.drop(listItem("Beta"), { dataTransfer });

        expect(savedIds()).toEqual(["b", "a"]);
        expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "a");
    });
});

describe("WebUIsPage configuration", () => {
    it("locks the client once it is chosen and reveals the settings", async () => {
        await renderPage([makeWebUISettings({ id: "draft", client: "" as Client, name: "" })]);
        const clientSelect = screen.getByRole("combobox") as HTMLSelectElement;
        expect(clientSelect).toBeEnabled();

        fireEvent.change(clientSelect, { target: { value: Client.DelugeWebUI } });

        expect(savedWebUIs()![0]!.client).toBe(Client.DelugeWebUI);
        expect(screen.getByRole("region", { name: "General" })).toBeInTheDocument();
        expect(screen.getAllByRole("combobox")[0]).toBeDisabled();
    });

    it("stores the connection fields as they are typed", async () => {
        await renderPage([ALPHA]);

        changeField("Host", "seedbox.example");
        expect(savedWebUIs()![0]!.host).toBe("seedbox.example");
        changeField("Relative Path", "/gui");
        expect(savedWebUIs()![0]!.relativePath).toBe("/gui");
        changeField("Username", "admin");
        expect(savedWebUIs()![0]!.username).toBe("admin");
        changeField("Password", "secret");
        expect(savedWebUIs()![0]!.password).toBe("secret");
    });

    it("shows the base URL the settings resolve to", async () => {
        await renderPage([ALPHA]);

        expect(screen.getByText("Base URL for API calls: http://alpha.example:8080")).toBeInTheDocument();
    });

    it.each([
        ["Secure (HTTPS)", "secure"],
        ["Add torrents paused", "addPaused"],
        ["Show per-torrent config selector", "showPerTorrentConfigSelector"],
        ["Use alternative container (window instead of popup)", "useAlternativeLabelDirChooser"],
    ] as const)("stores the %s toggle", async (label, key) => {
        await renderPage([ALPHA]);

        fireEvent.click(screen.getByRole("checkbox", { name: label }));

        expect(savedWebUIs()![0]![key]).toBe(true);
    });

    it("stores the default label and directory", async () => {
        await renderPage([ALPHA]);

        fireEvent.change(screen.getByPlaceholderText("Default label"), { target: { value: "movies" } });
        expect(savedWebUIs()![0]!.defaultLabel).toBe("movies");
        fireEvent.change(screen.getByPlaceholderText("Default directory"), { target: { value: "/data" } });
        expect(savedWebUIs()![0]!.defaultDir).toBe("/data");
    });

    it("stores labels added for per-torrent selection", async () => {
        await renderPage([ALPHA]);
        const labels = screen.getByText("Labels for per-torrent selection").parentElement!;

        fireEvent.change(within(labels).getByPlaceholderText("Add label"), { target: { value: "tv" } });
        fireEvent.click(within(labels).getByRole("button", { name: "Add" }));

        expect(savedWebUIs()![0]!.labels).toEqual(["tv"]);
    });

    it("stores a client-specific setting", async () => {
        await renderPage([ALPHA]);
        const clientSpecific = screen.getByRole("region", { name: "Client-specific settings" });

        fireEvent.click(within(clientSpecific).getAllByRole("checkbox")[0]!);

        expect(Object.values(savedWebUIs()![0]!.clientSpecificSettings)).toEqual([true]);
    });
});

describe("WebUIsPage connection test", () => {
    it("asks the service worker to test the edited settings and shows a success", async () => {
        const general = await testConnection(() => Promise.resolve(REACHABLE));

        expect(await within(general).findByText("✅ Reachable & authenticated")).toBeInTheDocument();
        expect(sentMessages(TestConnectionMessage.action)[0].webUiSettings).toMatchObject({ id: "a", host: "alpha.example" });
    });

    it("warns when the credentials were refused", async () => {
        const general = await testConnection(() => Promise.resolve({ ...REACHABLE, authenticated: false, message: "Wrong password" }));

        expect(await within(general).findByText("⚠ Wrong password")).toBeInTheDocument();
    });

    it("reports an unreachable client", async () => {
        const general = await testConnection(() => Promise.resolve({ ...REACHABLE, reachable: false, message: "No route" }));

        expect(await within(general).findByText("❌ No route")).toBeInTheDocument();
    });

    it("reports a test that could not be run at all", async () => {
        const general = await testConnection(() => Promise.reject(new Error("worker asleep")));

        expect(await within(general).findByText("❌ Error: worker asleep")).toBeInTheDocument();
    });

    it("disables the button while a test is running", async () => {
        const general = await testConnection(() => new Promise<ConnectionTestResult>(() => undefined));

        expect(within(general).getByRole("button", { name: "Testing…" })).toBeDisabled();
    });

    it("drops a result once the endpoint it described is edited", async () => {
        const general = await testConnection(() => Promise.resolve(REACHABLE));
        await within(general).findByText("✅ Reachable & authenticated");

        changeField("Host", "elsewhere.example");

        await waitFor(() => expect(within(general).queryByText("✅ Reachable & authenticated")).toBeNull());
    });
});
