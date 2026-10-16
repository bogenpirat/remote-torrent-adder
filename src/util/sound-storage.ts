// Persistent storage for user-provided notification sounds.
//
// Audio files are stored as native Blobs in IndexedDB rather than as base64
// data URLs inside the serialized settings. IndexedDB keeps binary data
// efficiently, isn't parsed on every settings read, and is shared across all
// extension contexts of the same origin (options page, offscreen document),
// so the offscreen player can read a sound back and play it directly.

import { type NotificationKind } from "../models/notification-kind";
import { type IdbStore, withStore } from "./idb";

export interface StoredSound {
    blob: Blob;
    name: string;
}

const SOUND_STORE: IdbStore = {
    dbName: "rta-sounds",
    storeName: "sounds",
    version: 1,
};

export function saveCustomSound(kind: NotificationKind, blob: Blob, name: string): Promise<void> {
    return withStore(SOUND_STORE, "readwrite", store => store.put({ blob, name } as StoredSound, kind)).then(() => undefined);
}

export function getCustomSound(kind: NotificationKind): Promise<StoredSound | undefined> {
    return withStore<StoredSound | undefined>(SOUND_STORE, "readonly", store => store.get(kind));
}

export function deleteCustomSound(kind: NotificationKind): Promise<void> {
    return withStore(SOUND_STORE, "readwrite", store => store.delete(kind)).then(() => undefined);
}
