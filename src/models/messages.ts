import { SerializedTorrent, TorrentUploadConfig } from "./torrent";
import { WebUISettings } from "./webui";

export const GetSettingsMessage: IMessagable = {
    action: "getSettings"
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

export interface IGetSettingsMessage extends IMessagable {
    text: string;
}

interface IMessagable {
    action: string;
}