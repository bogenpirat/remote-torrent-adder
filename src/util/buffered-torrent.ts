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
    if (!buffered) {
        return null;
    }
    return { ...buffered, torrent: await detachTorrentData(buffered.torrent) };
}

/**
 * Copies the payload out of the record it was stored in.
 *
 * Firefox backs an IndexedDB Blob with the stored record, so deleting the
 * record invalidates every Blob still referencing it: reads then fail with
 * "NotFoundError: Node was not found". Chrome refcounts blob data separately
 * and does not care. Since the caller clears the record as soon as it has taken
 * the torrent, the bytes have to stop depending on it here.
 */
async function detachTorrentData(torrent: Torrent): Promise<Torrent> {
    const data = torrent.data;
    // A magnet is a plain string, and a record written by an older version (or
    // by a store that could not hold a Blob) may be neither - leave both as
    // they are rather than failing the read here.
    if (typeof data === "string" || typeof data?.arrayBuffer !== "function") {
        return torrent;
    }
    return { ...torrent, data: new Blob([await data.arrayBuffer()], { type: data.type }) };
}

export function clearBufferedTorrent(): Promise<void> {
    return withStore(BUFFERED_TORRENT_STORE, "readwrite", store => store.delete(BUFFERED_TORRENT_KEY))
        .then(() => undefined);
}
