import { type TorrentWebUI } from "../models/webui";
import OnClickData = chrome.contextMenus.OnClickData;
import Tab = chrome.tabs.Tab;
import { type IPreAddTorrentMessage, PreAddTorrentMessage } from "../models/messages";
import { type TorrentDownloadContext } from "./download";
import { addTorrentToWebUiById, dispatchPreAddTorrent } from "./messaging";
import { loadWebUis } from "./webuis";

const PARENT_MENU_ID = "server-main";
const SEND_ALL_MENU_ID = "server-all";
const SEPARATOR_MENU_ID = "sendall-separator";
const PER_SERVER_MENU_PREFIX = "server-";

export function registerContextMenuClickListener(): void {
    chrome.contextMenus.onClicked.addListener((onClickData: OnClickData, tab?: Tab) => {
        handleContextMenuClick(onClickData, tab)
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
    await chrome.contextMenus.removeAll();

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
    chrome.contextMenus.create(properties, () => {
        if (chrome.runtime.lastError) {
            console.error(`Failed creating context menu item ${properties.id}`, chrome.runtime.lastError.message);
        }
    });
}

async function handleContextMenuClick(onClickData: OnClickData, tab?: Tab): Promise<void> {
    const menuItemId = onClickData.menuItemId.toString();
    if (!menuItemId.startsWith(PER_SERVER_MENU_PREFIX)) {
        return;
    }

    const targetWebUis = resolveTargetWebUis(menuItemId, await loadWebUis());
    if (targetWebUis.length === 0) {
        console.warn("Context menu clicked, but no matching WebUI is configured.", menuItemId);
        return;
    }

    const url = onClickData.linkUrl ?? "";
    const context = resolveDownloadContext(onClickData, tab);

    const [singleTarget] = targetWebUis;
    if (targetWebUis.length === 1 && singleTarget) {
        const preAddTorrentMessage: IPreAddTorrentMessage = {
            action: PreAddTorrentMessage.action,
            webUiId: singleTarget.settings.id,
            url
        };
        await dispatchPreAddTorrent(preAddTorrentMessage, await resolveWindowId(tab), context);
        return;
    }

    targetWebUis.forEach(webUi => addTorrentToWebUiById(webUi.settings.id, url, null, context));
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

function resolveDownloadContext(onClickData: OnClickData, tab?: Tab): TorrentDownloadContext {
    return {
        tabId: tab?.id ?? null,
        frameId: onClickData.frameId ?? 0,
        pageUrl: onClickData.frameUrl ?? onClickData.pageUrl ?? tab?.url ?? null
    };
}

async function resolveWindowId(tab?: Tab): Promise<number> {
    if (tab?.windowId !== undefined) {
        return tab.windowId;
    }
    return (await chrome.windows.getLastFocused()).id ?? 0;
}
