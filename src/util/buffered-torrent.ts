import { type Torrent } from "../models/torrent";
import { type WebUISettings } from "../models/webui";
import { type IdbStore, withStore } from "./idb";

/**
 * The torrent a click handed off to the popup, parked between the service
 * worker downloading it and the popup confirming where it should go.
 *
 * This lives in IndexedDB rather than chrome.storage.session because the
 * payload is a `.torrent` Blob. chrome.storage only holds JSON, which meant
 * base64-encoding the file (inflating it by a third, against a 10MB quota) on
 * the way in and decoding it again in the popup. IndexedDB stores the Blob as
 * it is, and the popup reads this record directly instead of asking the
 * service worker to hand the bytes back over a message.
 */
export interface BufferedTorrent {
    torrent: Torrent;
    webUiSettings: WebUISettings;
}

const BUFFERED_TORRENT_STORE: IdbStore = {
    dbName: "rta-torrents",
    storeName: "buffered",
    version: 1,
};

const BUFFERED_TORRENT_KEY = "pending";

export function saveBufferedTorrent(buffered: BufferedTorrent): Promise<void> {
    return withStore(BUFFERED_TORRENT_STORE, "readwrite", store => store.put(buffered, BUFFERED_TORRENT_KEY))
        .then(() => undefined);
}

export async function readBufferedTorrent(): Promise<BufferedTorrent | null> {
    const buffered = await withStore<BufferedTorrent | undefined>(
        BUFFERED_TORRENT_STORE,
        "readonly",
        store => store.get(BUFFERED_TORRENT_KEY),
    );
    return buffered ?? null;
}

export function clearBufferedTorrent(): Promise<void> {
    return withStore(BUFFERED_TORRENT_STORE, "readwrite", store => store.delete(BUFFERED_TORRENT_KEY))
        .then(() => undefined);
}
