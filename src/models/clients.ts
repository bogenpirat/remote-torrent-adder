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
import { TTorrentWebUI } from "../webuis/ttorrent-webui";
import { QNAPDownloadStationWebUI } from "../webuis/qnapdownloadstation-webui";

/**
 * Stable, opaque identifiers for each supported client. These values are
 * persisted in user settings and used as lookup keys, so they must never change.
 * What the user actually sees is defined separately in {@link ClientDisplayName},
 * which is free to change at any time. Legacy identifiers from older versions are
 * migrated in `util/legacy-client-identifiers.ts`.
 */
export enum Client {
    BiglyBTWebUI = "biglybt",
    DelugeWebUI = "deluge",
    ElementumWebUI = "elementum",
    FloodWebUI = "flood",
    QBittorrentWebUI = "qbittorrent",
    RuTorrentWebUI = "rutorrent",
    TixatiWebUI = "tixati",
    TransmissionWebUI = "transmission",
    TTorrentWebUI = "ttorrent",
    PorlaWebUI = "porla",
    QNAPDownloadStationWebUI = "qnap-download-station",
}

/**
 * Human-readable name for each {@link Client}, shown in the UI. Decoupled from
 * the identifier so labels can be reworded freely without touching stored data.
 */
export const ClientDisplayName: Record<Client, string> = {
    [Client.BiglyBTWebUI]: "BiglyBT",
    [Client.DelugeWebUI]: "Deluge",
    [Client.ElementumWebUI]: "Elementum",
    [Client.FloodWebUI]: "flood",
    [Client.QBittorrentWebUI]: "qBittorrent",
    [Client.RuTorrentWebUI]: "ruTorrent",
    [Client.TixatiWebUI]: "Tixati",
    [Client.TransmissionWebUI]: "Transmission",
    [Client.TTorrentWebUI]: "tTorrent",
    [Client.PorlaWebUI]: "Porla",
    [Client.QNAPDownloadStationWebUI]: "QNAP Download Station",
};

type ConcreteTorrentWebUIConstructor = new (settings: WebUISettings) => TorrentWebUI;

export const ClientClassByClient: Record<Client, ConcreteTorrentWebUIConstructor> = {
    [Client.BiglyBTWebUI]: BiglyBTWebUI,
    [Client.DelugeWebUI]: DelugeWebUI,
    [Client.ElementumWebUI]: ElementumWebUI,
    [Client.FloodWebUI]: FloodWebUI,
    [Client.QBittorrentWebUI]: QBittorrentWebUI,
    [Client.RuTorrentWebUI]: RuTorrentWebUI,
    [Client.TixatiWebUI]: TixatiWebUI,
    [Client.TransmissionWebUI]: TransmissionWebUI,
    [Client.TTorrentWebUI]: TTorrentWebUI,
    [Client.PorlaWebUI]: PorlaWebUI,
    [Client.QNAPDownloadStationWebUI]: QNAPDownloadStationWebUI,
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
