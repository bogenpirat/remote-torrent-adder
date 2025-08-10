import { RTASettings } from "./settings";
import { SerializedTorrent, TorrentUploadConfig } from "./torrent";
import { WebUISettings } from "./webui";

export const GetSettingsMessage: IMessagable = {
    action: "getSettings"
}

export const SaveSettingsMessage: IMessagable = {
    action: "saveSettings"
}

export const TestNotificationMessage: IMessagable = {
    action: "testNotification"
}

export const PreAddTorrentMessage: IMessagable = {
    action: "preAddTorrent"
}

export const AddTorrentMessage: IMessagable = {
    action: "addTorrent"
}

export const AddTorrentMessageWithLabelAndDir: IMessagable = {
    action: "addTorrentMessageWithLabelAndDir"
}

export const GetPreAddedTorrentAndSettings: IMessagable = {
    action: "getPreAddedTorrentAndSettings"
}

export const GetPreAddedTorrentAndSettingsResponse: IMessagable = {
    action: "getPreAddedTorrentAndSettingsResponse"
}

export const UpdateActionBadgeText: IMessagable = {
    action: "updateActionBadgeText"
}

export const PlaySoundMessage: IMessagable = {
    action: "playSound"
}

export interface IGetPreAddedTorrentAndSettingsResponse extends IMessagable {
    webUiSettings: WebUISettings;
    serializedTorrent: SerializedTorrent;
    autoLabelDirResult?: {
        label?: string;
        directory?: string;
    };
}

export interface IAddTorrentMessage extends IPreAddTorrentMessage {
    webUiId: string;
    config: TorrentUploadConfig;
}

export interface IAddTorrentMessageWithLabelAndDir extends IMessagable {
    webUiId: string;
    config: TorrentUploadConfig;
    serializedTorrent: SerializedTorrent;
    labels: string[];
    directories: string[];
}

export interface IPreAddTorrentMessage extends IMessagable {
    url: string;
    webUiId?: string | null;
}

export interface IUpdateActionBadgeTextMessage extends IMessagable {
    text: string;
}

export interface ISaveSettingsMessage extends IMessagable {
    settings: RTASettings;
}

export interface ITestNotificationMessage extends IMessagable {
    title: string;
    message: string;
    isFailed: boolean;
    popupDurationMs: number;
    playSound: boolean;
}

export interface IPlaySoundMessage extends IMessagable {
    source: string;
    volume: number;
}

interface IMessagable {
    action: string;
}


export interface RegisteredListeners {
    messageListener: (message: any, sender: any, sendResponse: any) => void;
    actionIconListener: (tab: chrome.tabs.Tab) => Promise<void>;
}