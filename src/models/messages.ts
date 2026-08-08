import { type RTASettings } from "./settings";
import { type TorrentUploadConfig } from "./torrent";
import { type WebUISettings } from "./webui";

export const GetSettingsMessage: IMessagable = {
    action: "getSettings"
}

export const GetLinkCatchingConfig: IMessagable = {
    action: "getLinkCatchingConfig"
}

export const GetPageLinksMessage: IMessagable = {
    action: "getPageLinks"
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

export const UpdateActionBadgeText: IMessagable = {
    action: "updateActionBadgeText"
}

export const PlaySoundMessage: IMessagable = {
    action: "playSound"
}

export const TestConnectionMessage: IMessagable = {
    action: "testConnection"
}

export const FetchTorrentInPageMessage: IMessagable = {
    action: "fetchTorrentInPage"
}

export interface IAddTorrentMessage extends IPreAddTorrentMessage {
    webUiId: string;
    config: TorrentUploadConfig;
}

export interface IAddTorrentMessageWithLabelAndDir extends IMessagable {
    webUiId: string;
    config: TorrentUploadConfig;
    labels: string[];
    directories: string[];
}

export interface IPreAddTorrentMessage extends IMessagable {
    url: string;
    webUiId?: string | null;
    tabId?: number | null;
    frameId?: number | null;
    pageUrl?: string | null;
}

export interface IFetchTorrentInPageMessage extends IMessagable {
    url: string;
}

export interface IFetchedTorrentFile {
    ok: boolean;
    status: number;
    statusText: string;
    contentType: string | null;
    cfMitigated: string | null;
    finalUrl: string;
    base64: string;
}

export interface IFetchTorrentInPageResponse {
    fetched?: IFetchedTorrentFile;
    error?: string;
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
    isFailed: boolean;
}

export interface ITestConnectionMessage extends IMessagable {
    webUiSettings: WebUISettings;
}

export interface ILinkCatchingConfig {
    linkCatchingEnabled: boolean;
    linkCatchingRegexes: RegExp[];
}

export interface IPageLinkInfo {
    url: string;
    label: string;
}

export interface IPageLinksResponse {
    links: IPageLinkInfo[];
}

export interface IMessagable {
    action: string;
}