import { TorrentWebUI, WebUISettings } from "./webui";
import { BiglyBTWebUI } from "../webuis/biglybt-webui";
import { RuTorrentWebUI } from "../webuis/rutorrent-webui";
import { FloodWebUI } from "../webuis/flood-webui";
import { QBittorrentWebUI } from "../webuis/qbittorrent-webui";
import { DelugeWebUI } from "../webuis/deluge-webui";
import { ElementumWebUI } from "../webuis/elementum-webui";
import { TransmissionWebUI } from "../webuis/transmission-webui";
import { PorlaWebUI } from "../webuis/porla-webui";
import { TixatiWebUI } from "../webuis/tixati-webui";

export enum Client {
    BiglyBTWebUI = "BiglyBT WebUI",
    DelugeWebUI = "Deluge WebUI",
    ElementumWebUI = "Elementum WebUI",
    FloodWebUI = "flood WebUI",
    HadoukenWebUI = "Hadouken WebUI",
    QBittorrentWebUI = "qBittorrent WebUI",
    RuTorrentWebUI = "ruTorrent WebUI",
    TixatiWebUI = "Tixati WebUI",
    TransmissionWebUI = "Transmission WebUI",
    TTorrentWebUI = "tTorrent WebUI",
    UTorrentWebUI = "uTorrent WebUI",
    PorlaWebUI = "Porla WebUI",
}

type ConcreteTorrentWebUIConstructor = new (settings: WebUISettings) => TorrentWebUI;

export const ClientClassByClient: Record<Client, ConcreteTorrentWebUIConstructor> = {
    [Client.BiglyBTWebUI]: BiglyBTWebUI,
    [Client.DelugeWebUI]: DelugeWebUI,
    [Client.ElementumWebUI]: ElementumWebUI,
    [Client.FloodWebUI]: FloodWebUI,
    [Client.HadoukenWebUI]: BuffaloWebUI, // TODO: placeholder
    [Client.QBittorrentWebUI]: QBittorrentWebUI,
    [Client.RuTorrentWebUI]: RuTorrentWebUI,
    [Client.TixatiWebUI]: TixatiWebUI,
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
