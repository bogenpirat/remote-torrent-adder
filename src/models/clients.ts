import { BiglyBTWebUI } from "../webuis/biglybt-webui";
import { BuffaloWebUI } from "../webuis/buffalo-webui";
import { RuTorrentWebUI } from "../webuis/rutorrent-webui";
import { FloodWebUI } from "../webuis/flood";
import { TorrentWebUI, WebUISettings } from "./webui";

export enum Client {
    BiglyBTWebUI = "BiglyBT WebUI",
    BuffaloWebUI = "Buffalo WebUI",
    DelugeWebUI = "Deluge WebUI",
    ElementumWebUI = "Elementum WebUI",
    FloodJesecWebUI = "flood-jesec WebUI",
    FloodWebUI = "flood WebUI",
    HadoukenWebUI = "Hadouken WebUI",
    NodeJSrTorrentWebUI = "NodeJS-rTorrent WebUI",
    PyrtWebUI = "pyrt WebUI",
    QBittorrentWebUI = "qBittorrent WebUI",
    QBittorrentWebUIv2 = "qBittorrent v4.1+ WebUI",
    QnapDownloadStationWebUI = "QNAP DownloadStation",
    RTorrentXmlRPCWebUI = "rTorrent XML-RPC",
    RuTorrentWebUI = "ruTorrent WebUI",
    SynologyWebUI = "Synology WebUI",
    TixatiWebUI = "Tixati WebUI",
    TorrentfluxWebUI = "Torrentflux WebUI",
    TransmissionWebUI = "Transmission WebUI",
    TTorrentWebUI = "tTorrent WebUI",
    UTorrentWebUI = "uTorrent WebUI",
    VuzeHTMLUI = "Vuze HTML WebUI",
    VuzeRemoteUI = "Bigly/Vuze Remote WebUI",
    VuzeSwingUI = "Vuze SwingUI",
}

type ConcreteTorrentWebUIConstructor = new (settings: WebUISettings) => TorrentWebUI;

export const ClientClassByClient: Record<Client, ConcreteTorrentWebUIConstructor> = {
    [Client.BiglyBTWebUI]: BiglyBTWebUI,
    [Client.BuffaloWebUI]: BuffaloWebUI, // TODO: broken
    [Client.DelugeWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.ElementumWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.FloodJesecWebUI]: FloodWebUI,
    [Client.FloodWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.HadoukenWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.NodeJSrTorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.PyrtWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.QBittorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.QBittorrentWebUIv2]: BuffaloWebUI, // TODO: placeholder
    [Client.QnapDownloadStationWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.RTorrentXmlRPCWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.RuTorrentWebUI]: RuTorrentWebUI,
    [Client.SynologyWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.TixatiWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.TorrentfluxWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.TransmissionWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.TTorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.UTorrentWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.VuzeHTMLUI]: BuffaloWebUI, // TODO: placeholder
    [Client.VuzeRemoteUI]: BuffaloWebUI, // TODO: placeholder
    [Client.VuzeSwingUI]: BuffaloWebUI, // TODO: placeholder
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
