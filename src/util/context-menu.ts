import { ext } from "./browser-api";
import { type TorrentWebUI } from "../models/webui";
import OnClickData = chrome.contextMenus.OnClickData;
import Tab = chrome.tabs.Tab;
import { type TorrentDownloadContext } from "./download";
import { addTorrentToWebUiById, dispatchPreAddTorrent } from "./add-torrent";
import { type RTASettings } from "../models/settings";
import { Settings } from "./settings";
import { initiateWebUis } from "./webuis";

const PARENT_MENU_ID = "server-main";
const SEND_ALL_MENU_ID = "server-all";
const SEPARATOR_MENU_ID = "sendall-separator";
const PER_SERVER_MENU_PREFIX = "server-";

interface MenuClick {
    onClickData: OnClickData;
    tab?: Tab;
}

export function registerContextMenuClickListener(): void {
    ext.contextMenus.onClicked.addListener((onClickData: OnClickData, tab?: Tab) => {
        handleContextMenuClick({ onClickData, tab }, new Settings())
            .catch(error => console.error("Context menu click failed", error));
    });
}

let pendingRefresh: Promise<void> = Promise.resolve();

export function refreshContextMenu(allWebUis: TorrentWebUI[]): Promise<void> {
    pendingRefresh = pendingRefresh
        .catch(() => undefined)
        .then(() => rebuildContextMenu(allWebUis));
    return pendingRefresh;
}

async function rebuildContextMenu(allWebUis: TorrentWebUI[]): Promise<void> {
    await ext.contextMenus.removeAll();

    createMenuItem({
        id: PARENT_MENU_ID,
        title: "Add to Remote WebUI",
        contexts: ["link"]
    });

    if (allWebUis.length > 1) {
        allWebUis.forEach((webUi, index) => {
            createMenuItem({
                id: `${PER_SERVER_MENU_PREFIX}${index}`,
                title: webUi.name,
                contexts: ["link"],
                parentId: PARENT_MENU_ID
            });
        });
        createMenuItem({ id: SEPARATOR_MENU_ID, type: "separator", contexts: ["link"], parentId: PARENT_MENU_ID });
        createMenuItem({
            id: SEND_ALL_MENU_ID,
            title: "send to all",
            contexts: ["link"],
            parentId: PARENT_MENU_ID
        });
    }
}

function createMenuItem(properties: chrome.contextMenus.CreateProperties): void {
    ext.contextMenus.create(properties, () => {
        if (ext.runtime.lastError) {
            console.error(`Failed creating context menu item ${properties.id}`, ext.runtime.lastError.message);
        }
    });
}

async function handleContextMenuClick(menuClick: MenuClick, settingsProvider: Settings): Promise<void> {
    const menuItemId = menuClick.onClickData.menuItemId.toString();
    if (!menuItemId.startsWith(PER_SERVER_MENU_PREFIX)) {
        return;
    }

    const settings = await settingsProvider.loadSettings();
    const targetWebUis = resolveTargetWebUis(menuItemId, await initiateWebUis(settings));
    if (targetWebUis.length === 0) {
        console.warn("Context menu clicked, but no matching WebUI is configured.", menuItemId);
        return;
    }

    await addLinkToWebUis(targetWebUis, menuClick, settings);
}

async function addLinkToWebUis(targetWebUis: TorrentWebUI[], { onClickData, tab }: MenuClick, settings: RTASettings): Promise<void> {
    const url = onClickData.linkUrl ?? "";
    const context = downloadContextFromMenuClick(onClickData, tab);

    const [singleTarget] = targetWebUis;
    if (targetWebUis.length === 1 && singleTarget) {
        const windowId = await resolveWindowId(tab);
        await dispatchPreAddTorrent({ webUiId: singleTarget.settings.id, url, windowId, context }, settings);
        return;
    }

    await Promise.all(
        targetWebUis.map(webUi => addTorrentToWebUiById({ webUiId: webUi.settings.id, url, config: null }, context, settings))
    );
}

function resolveTargetWebUis(menuItemId: string, allWebUis: TorrentWebUI[]): TorrentWebUI[] {
    if (menuItemId === PARENT_MENU_ID) {
        return allWebUis.slice(0, 1);
    }
    if (menuItemId === SEND_ALL_MENU_ID) {
        return allWebUis;
    }
    const index = Number.parseInt(menuItemId.slice(PER_SERVER_MENU_PREFIX.length), 10);
    const webUiAtIndex = Number.isInteger(index) ? allWebUis[index] : undefined;
    return webUiAtIndex ? [webUiAtIndex] : [];
}

function downloadContextFromMenuClick(onClickData: OnClickData, tab?: Tab): TorrentDownloadContext {
    return {
        tabId: tab?.id ?? null,
        frameId: onClickData.frameId ?? 0,
        pageUrl: resolvePageUrl(onClickData, tab)
    };
}

function resolvePageUrl(onClickData: OnClickData, tab?: Tab): string | undefined {
    return onClickData.frameUrl ?? onClickData.pageUrl ?? tab?.url;
}

async function resolveWindowId(tab?: Tab): Promise<number> {
    if (tab?.windowId !== undefined) {
        return tab.windowId;
    }
    return (await ext.windows.getLastFocused()).id ?? 0;
}
