import { TorrentWebUI } from "../models/webui";
import OnClickData = chrome.contextMenus.OnClickData;
import Tab = chrome.tabs.Tab;
import { AddTorrentMessage, IAddTorrentMessage, IPreAddTorrentMessage, PreAddTorrentMessage } from "../models/messages";
import { dispatchPreAddTorrent } from "./messaging";
import { Settings } from "./settings";


const settingsProvider = new Settings();

export function createContextMenu(allWebUis: TorrentWebUI[]): void {
    chrome.contextMenus.removeAll();

    var parentContextMenuId = chrome.contextMenus.create({
        id: "server-main",
        title: "Add to Remote WebUI",
        contexts: ["link"]
    });

    if (allWebUis.length > 1) {
        for (var i = 0; i < allWebUis.length; i++) {
            chrome.contextMenus.create({
                id: `server-${i}`,
                title: allWebUis[i].name,
                contexts: ["link"],
                parentId: parentContextMenuId
            });
        }
        chrome.contextMenus.create({ id: "sendall-separator", type: "separator", contexts: ["link"], parentId: parentContextMenuId });
        chrome.contextMenus.create({
            id: "server-all",
            title: "send to all",
            contexts: ["link"],
            parentId: parentContextMenuId
        });
    }

    chrome.contextMenus.onClicked.addListener((onClickData: OnClickData, tab: Tab) => {
        if (onClickData.menuItemId === "server-main") {
            createOnClick(allWebUis.length > 0 ? [allWebUis[0]] : [])(onClickData, tab);
        } else if (onClickData.menuItemId.toString().startsWith("server-")) {
            const index = parseInt(onClickData.menuItemId.toString().split("-")[1], 10);
            if (index >= 0 && index < allWebUis.length) {
                createOnClick([allWebUis[index]])(onClickData, tab);
            }
        } else if (onClickData.menuItemId === "server-all") {
            createOnClick(allWebUis)(onClickData, tab);
        }
    });
}

function createOnClick(webUis: TorrentWebUI[]): (onClickData: OnClickData, tab: Tab) => void {
    return (onClickData: OnClickData, tab: Tab) => {
        if (webUis.length === 0) {
            throw new Error("no servers configured");
        }

        if (webUis.length === 1) {
            const preAddTorrentMessage: IPreAddTorrentMessage = {
                action: PreAddTorrentMessage.action,
                webUiId: webUis[0].settings.id,
                url: onClickData.linkUrl
            };
            dispatchPreAddTorrent(preAddTorrentMessage, settingsProvider, tab.windowId);
        } else {
            webUis.forEach(webUi => {
                const addTorrentMessage: IAddTorrentMessage = {
                    action: AddTorrentMessage.action,
                    webUiId: webUi.settings.id,
                    url: onClickData.linkUrl,
                    config: null
                };
                dispatchPreAddTorrent(addTorrentMessage, settingsProvider, tab.windowId);
            });
        }
    };
}