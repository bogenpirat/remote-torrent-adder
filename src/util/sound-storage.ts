// Persistent storage for user-provided notification sounds.
//
// Audio files are stored as native Blobs in IndexedDB rather than as base64
// data URLs inside the serialized settings. IndexedDB keeps binary data
// efficiently, isn't parsed on every settings read, and is shared across all
// extension contexts of the same origin (options page, offscreen document),
// so the offscreen player can read a sound back and play it directly.

export type SoundKind = "success" | "failure";

export interface StoredSound {
    blob: Blob;
    name: string;
}

const DB_NAME = "rta-sounds";
const STORE_NAME = "sounds";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function withStore<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return openDb().then(db => new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = op(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    }));
}

export function saveCustomSound(kind: SoundKind, blob: Blob, name: string): Promise<void> {
    return withStore("readwrite", store => store.put({ blob, name } as StoredSound, kind)).then(() => undefined);
}

export function getCustomSound(kind: SoundKind): Promise<StoredSound | undefined> {
    return withStore<StoredSound | undefined>("readonly", store => store.get(kind));
}

export function deleteCustomSound(kind: SoundKind): Promise<void> {
    return withStore("readwrite", store => store.delete(kind)).then(() => undefined);
}
