// Minimal promise wrapper over IndexedDB.
//
// IndexedDB is the only storage in an extension that holds binary data as
// native Blobs, is shared across every extension context of the same origin
// (service worker, popup, options page, offscreen document), and is not
// capped the way chrome.storage.session is.

export interface IdbStore {
    dbName: string;
    storeName: string;
    version: number;
}

function openDb(store: IdbStore): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(store.dbName, store.version);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(store.storeName)) {
                request.result.createObjectStore(store.storeName);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function withStore<T>(
    store: IdbStore,
    mode: IDBTransactionMode,
    operation: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return openDb(store).then(db => new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store.storeName, mode);
        const request = operation(transaction.objectStore(store.storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    }));
}
