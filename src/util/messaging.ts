import { ext } from "./browser-api";
import {
    AddTorrentMessage,
    GetSettingsMessage,
    GetLinkCatchingConfig,
    type IAddTorrentMessage,
    type IAddTorrentMessageWithLabelAndDir,
    type IPreAddTorrentMessage,
    PreAddTorrentMessage,
    AddTorrentMessageWithLabelAndDir,
    UpdateActionBadgeText,
    SaveSettingsMessage,
    type IUpdateActionBadgeTextMessage,
    TestNotificationMessage,
    TestConnectionMessage,
    type ITestConnectionMessage,
    type ISaveSettingsMessage,
    type ITestNotificationMessage,
    type IMessagable
} from "../models/messages";
import { type ConnectionTestResult, type WebUISettings } from "../models/webui";
import { WebUIFactory } from "../models/clients";
import { updateBadgeText } from "./action";
import { addBufferedTorrent, addTorrentToWebUiById, dispatchPreAddTorrent } from "./add-torrent";
import { executeMethodWrappedWithOriginStripped } from "./cors-tricks";
import { type TorrentDownloadContext } from "./download";
import { showNotification } from "./notifications";
import { serializeSettings, serializeObject, deserializeSettings } from "./serializer";
import { Settings } from "./settings";

type MessageSender = chrome.runtime.MessageSender;
type SendResponse = (response?: unknown) => void;

interface MessageRequest {
    message: IMessagable;
    sender: MessageSender;
    settingsProvider: Settings;
}

interface Responder {
    finish: (payload?: unknown) => void;
    fail: (error: unknown) => void;
}

type AsyncMessageHandler = (request: MessageRequest) => Promise<unknown>;
type SyncMessageHandler = (request: MessageRequest, responder: Responder) => void;

const ASYNC_MESSAGE_HANDLERS = new Map<string, AsyncMessageHandler>([
    [GetSettingsMessage.action, loadSerializedSettings],
    [GetLinkCatchingConfig.action, loadSerializedLinkCatchingConfig],
    [SaveSettingsMessage.action, saveSettings],
    [TestConnectionMessage.action, testConnection],
    [PreAddTorrentMessage.action, preAddTorrent],
    [AddTorrentMessage.action, addTorrent],
    [AddTorrentMessageWithLabelAndDir.action, addTorrentWithLabelAndDir],
]);

const SYNC_MESSAGE_HANDLERS = new Map<string, SyncMessageHandler>([
    [TestNotificationMessage.action, showTestNotification],
    [UpdateActionBadgeText.action, updateActionBadgeText],
]);

export function registerMessageListener(): void {
    ext.runtime.onMessage.addListener(handleMessage);
}

function handleMessage(message: IMessagable, sender: MessageSender, sendResponse: SendResponse): boolean {
    const responder = createResponder(message, sendResponse);
    if (!message || !message.action) {
        responder.finish({ error: "missing action" });
        return false;
    }

    console.debug(`Received message of type ${message.action}:`, message, sender);
    try {
        return routeMessage({ message, sender, settingsProvider: new Settings() }, responder);
    } catch (err) {
        responder.fail(err);
        return false;
    }
}

function createResponder(message: IMessagable, sendResponse: SendResponse): Responder {
    const finish = (payload?: unknown) => {
        try { sendResponse(payload); } catch { /* channel maybe closed */ }
    };
    const fail = (err: unknown) => {
        console.error("Message handling error", message?.action, err);
        finish({ error: (err as Error)?.message || String(err) });
    };
    return { finish, fail };
}

function routeMessage(request: MessageRequest, responder: Responder): boolean {
    const { action } = request.message;
    const asyncHandler = ASYNC_MESSAGE_HANDLERS.get(action);
    if (asyncHandler) {
        asyncHandler(request).then(responder.finish).catch(responder.fail);
        return true;
    }

    const syncHandler = SYNC_MESSAGE_HANDLERS.get(action);
    if (syncHandler) {
        syncHandler(request, responder);
    } else {
        responder.finish({ error: `unknown action: ${action}` });
    }
    return false;
}

async function loadSerializedSettings({ settingsProvider }: MessageRequest): Promise<string> {
    return serializeSettings(await settingsProvider.loadSettings());
}

async function loadSerializedLinkCatchingConfig({ settingsProvider }: MessageRequest): Promise<string> {
    const settings = await settingsProvider.loadSettings();
    return serializeObject({
        linkCatchingEnabled: settings.linkCatchingEnabled,
        linkCatchingRegexes: settings.linkCatchingRegexes,
    });
}

async function saveSettings({ message, settingsProvider }: MessageRequest): Promise<object> {
    const saveSettingsMessage = message as ISaveSettingsMessage & { settings: string };
    await settingsProvider.saveSettings(deserializeSettings(saveSettingsMessage.settings));
    return {};
}

async function testConnection({ message }: MessageRequest): Promise<ConnectionTestResult> {
    return testConnectionForWebUiSettings((message as ITestConnectionMessage).webUiSettings);
}

async function preAddTorrent({ message, sender, settingsProvider }: MessageRequest): Promise<object> {
    const preAddTorrentMessage = message as IPreAddTorrentMessage;
    const lastFocusedWindow = await ext.windows.getLastFocused();
    const preAddRequest = {
        webUiId: preAddTorrentMessage.webUiId ?? "",
        url: preAddTorrentMessage.url,
        windowId: sender.tab?.windowId ?? lastFocusedWindow.id ?? 0,
        context: downloadContextFromSender(preAddTorrentMessage, sender),
    };
    dispatchPreAddTorrent(preAddRequest, await settingsProvider.loadSettings())
        .catch(error => console.error("Failed pre-adding a torrent:", error));
    return {};
}

async function addTorrent({ message, sender, settingsProvider }: MessageRequest): Promise<object> {
    const addTorrentMessage = message as IAddTorrentMessage;
    const context = downloadContextFromSender(addTorrentMessage, sender);
    await addTorrentToWebUiById(addTorrentMessage, context, await settingsProvider.loadSettings());
    return {};
}

async function addTorrentWithLabelAndDir({ message, settingsProvider }: MessageRequest): Promise<object> {
    await addBufferedTorrent(message as IAddTorrentMessageWithLabelAndDir, settingsProvider);
    return {};
}

function showTestNotification({ message }: MessageRequest, responder: Responder): void {
    const testNotificationMessage = message as ITestNotificationMessage;
    showNotification({
        title: testNotificationMessage.title,
        message: testNotificationMessage.message,
        isFailed: testNotificationMessage.isFailed,
        popupDurationMs: testNotificationMessage.popupDurationMs,
        playSound: testNotificationMessage.playSound,
    });
    responder.finish({});
}

function updateActionBadgeText({ message, sender }: MessageRequest): void {
    updateBadgeText((message as IUpdateActionBadgeTextMessage).text, sender.tab?.id || -1);
}

export function downloadContextFromSender(message: IPreAddTorrentMessage, sender: MessageSender): TorrentDownloadContext {
    const messageContext = contextCarriedByMessage(message);
    if (!sender.tab) {
        return messageContext;
    }
    return {
        tabId: sender.tab.id ?? messageContext.tabId,
        frameId: sender.frameId ?? 0,
        pageUrl: sender.url ?? sender.tab.url ?? messageContext.pageUrl
    };
}

function contextCarriedByMessage(message: IPreAddTorrentMessage): TorrentDownloadContext {
    return {
        tabId: message.tabId ?? null,
        frameId: message.frameId ?? 0,
        pageUrl: message.pageUrl ?? null
    };
}

async function testConnectionForWebUiSettings(webUiSettings: WebUISettings): Promise<ConnectionTestResult> {
    if (!WebUIFactory.supports(webUiSettings.client)) {
        return { reachable: false, authenticated: null, httpResponseCode: 0, message: "No client selected for this WebUI." };
    }
    const webUi = WebUIFactory.createWebUI(webUiSettings);
    return executeMethodWrappedWithOriginStripped(() => webUi.testConnection(), webUi.createBaseUrl());
}
