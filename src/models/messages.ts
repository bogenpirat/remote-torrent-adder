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

export const GetPreAddedTorrentAndSettings: IMessagable = {
    action: "getPreAddedTorrentAndSettings"
}

export const GetPreAddedTorrentAndSettingsResponse: IMessagable = {
    action: "getPreAddedTorrentAndSettingsResponse"
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

export interface IPreAddTorrentMessage extends IMessagable {
    url: string;
    webUiId?: string | null;
}

interface IMessagable {
    action: string;
}