import { TorrentWebUI } from "../models/webui";
import OnClickData = chrome.contextMenus.OnClickData;
import Tab = chrome.tabs.Tab;
import { IPreAddTorrentMessage, PreAddTorrentMessage } from "../models/messages";
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

export function refreshContextMenu(allWebUis: TorrentWebUI[]): void {
    chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
        id: PARENT_MENU_ID,
        title: "Add to Remote WebUI",
        contexts: ["link"]
    });

    if (allWebUis.length > 1) {
        allWebUis.forEach((webUi, index) => {
            chrome.contextMenus.create({
                id: `${PER_SERVER_MENU_PREFIX}${index}`,
                title: webUi.name,
                contexts: ["link"],
                parentId: PARENT_MENU_ID
            });
        });
        chrome.contextMenus.create({ id: SEPARATOR_MENU_ID, type: "separator", contexts: ["link"], parentId: PARENT_MENU_ID });
        chrome.contextMenus.create({
            id: SEND_ALL_MENU_ID,
            title: "send to all",
            contexts: ["link"],
            parentId: PARENT_MENU_ID
        });
    }
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

    if (targetWebUis.length === 1) {
        const preAddTorrentMessage: IPreAddTorrentMessage = {
            action: PreAddTorrentMessage.action,
            webUiId: targetWebUis[0].settings.id,
            url
        };
        await dispatchPreAddTorrent(preAddTorrentMessage, await resolveWindowId(tab));
        return;
    }

    targetWebUis.forEach(webUi => addTorrentToWebUiById(webUi.settings.id, url, null));
}

function resolveTargetWebUis(menuItemId: string, allWebUis: TorrentWebUI[]): TorrentWebUI[] {
    if (menuItemId === PARENT_MENU_ID) {
        return allWebUis.slice(0, 1);
    }
    if (menuItemId === SEND_ALL_MENU_ID) {
        return allWebUis;
    }
    const index = Number.parseInt(menuItemId.slice(PER_SERVER_MENU_PREFIX.length), 10);
    if (!Number.isInteger(index) || index < 0 || index >= allWebUis.length) {
        return [];
    }
    return [allWebUis[index]];
}

async function resolveWindowId(tab?: Tab): Promise<number> {
    if (tab?.windowId !== undefined) {
        return tab.windowId;
    }
    return (await chrome.windows.getLastFocused()).id ?? 0;
}
