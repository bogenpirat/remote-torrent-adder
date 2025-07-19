import { BuffaloWebUI } from "../webuis/buffalo-webui";
import { TorrentWebUI, WebUISettings } from "./webui";

export enum Client {
    BuffaloWebUI = "Buffalo WebUI (OLD!)",
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
    [Client.BuffaloWebUI]: BuffaloWebUI,
    [Client.DelugeWebUI]: BuffaloWebUI,
    [Client.ElementumWebUI]: BuffaloWebUI,
    [Client.FloodJesecWebUI]: BuffaloWebUI,
    [Client.FloodWebUI]: BuffaloWebUI,
    [Client.HadoukenWebUI]: BuffaloWebUI,
    [Client.NodeJSrTorrentWebUI]: BuffaloWebUI,
    [Client.PyrtWebUI]: BuffaloWebUI,
    [Client.QBittorrentWebUI]: BuffaloWebUI,
    [Client.QBittorrentWebUIv2]: BuffaloWebUI,
    [Client.QnapDownloadStationWebUI]: BuffaloWebUI,
    [Client.RTorrentXmlRPCWebUI]: BuffaloWebUI,
    [Client.RuTorrentWebUI]: BuffaloWebUI,
    [Client.SynologyWebUI]: BuffaloWebUI,
    [Client.TixatiWebUI]: BuffaloWebUI,
    [Client.TorrentfluxWebUI]: BuffaloWebUI,
    [Client.TransmissionWebUI]: BuffaloWebUI,
    [Client.TTorrentWebUI]: BuffaloWebUI,
    [Client.UTorrentWebUI]: BuffaloWebUI,
    [Client.VuzeHTMLUI]: BuffaloWebUI,
    [Client.VuzeRemoteUI]: BuffaloWebUI,
    [Client.VuzeSwingUI]: BuffaloWebUI,
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
