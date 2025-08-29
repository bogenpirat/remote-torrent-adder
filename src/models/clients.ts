import { TorrentWebUI, WebUISettings } from "./webui";
import { BiglyBTWebUI } from "../webuis/biglybt-webui";
import { BuffaloWebUI } from "../webuis/buffalo-webui";
import { RuTorrentWebUI } from "../webuis/rutorrent-webui";
import { FloodWebUI } from "../webuis/flood-webui";
import { QBittorrentWebUI } from "../webuis/qbittorrent-webui";
import { DelugeWebUI } from "../webuis/deluge-webui";
import { ElementumWebUI } from "../webuis/elementum-webui";
import { TransmissionWebUI } from "../webuis/transmission-webui";
import { PorlaWebUI } from "../webuis/porla-webui";

export enum Client {
    BiglyBTWebUI = "BiglyBT WebUI",
    BuffaloWebUI = "Buffalo WebUI",
    DelugeWebUI = "Deluge WebUI",
    ElementumWebUI = "Elementum WebUI",
    FloodWebUI = "flood WebUI",
    HadoukenWebUI = "Hadouken WebUI",
    NodeJSrTorrentWebUI = "NodeJS-rTorrent WebUI",
    PyrtWebUI = "pyrt WebUI",
    QBittorrentWebUI = "qBittorrent WebUI",
    QnapDownloadStationWebUI = "QNAP DownloadStation",
    RuTorrentWebUI = "ruTorrent WebUI",
    SynologyWebUI = "Synology WebUI",
    TixatiWebUI = "Tixati WebUI",
    TransmissionWebUI = "Transmission WebUI",
    TTorrentWebUI = "tTorrent WebUI",
    UTorrentWebUI = "uTorrent WebUI",
    PorlaWebUI = "Porla WebUI",
}

type ConcreteTorrentWebUIConstructor = new (settings: WebUISettings) => TorrentWebUI;

export const ClientClassByClient: Record<Client, ConcreteTorrentWebUIConstructor> = {
    [Client.BiglyBTWebUI]: BiglyBTWebUI,
    [Client.BuffaloWebUI]: BuffaloWebUI, // TODO: broken
    [Client.DelugeWebUI]: DelugeWebUI,
    [Client.ElementumWebUI]: ElementumWebUI,
    [Client.FloodWebUI]: FloodWebUI,
    [Client.HadoukenWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.NodeJSrTorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.PyrtWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.QBittorrentWebUI]: QBittorrentWebUI,
    [Client.QnapDownloadStationWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.RuTorrentWebUI]: RuTorrentWebUI,
    [Client.SynologyWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.TixatiWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.TransmissionWebUI]: TransmissionWebUI,
    [Client.TTorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.UTorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.PorlaWebUI]: PorlaWebUI,
};

export class WebUIFactory {
    static createWebUI(settings: WebUISettings): TorrentWebUI | null {
        const ClientClass = ClientClassByClient[settings.client];
        if (ClientClass === undefined) {
            return null;
        }
        return new ClientClass(settings);
    }
}
