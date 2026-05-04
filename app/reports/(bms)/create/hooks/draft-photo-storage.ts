"use client";

const IDB_DB_NAME = "sparta-bms-draft";
const IDB_STORE_NAME = "photos";
const IDB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
        req.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
                db.createObjectStore(IDB_STORE_NAME, { keyPath: "id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveDraftPhoto(
    itemId: string,
    file: File,
): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        tx.objectStore(IDB_STORE_NAME).put({ id: itemId, file });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadDraftPhoto(itemId: string): Promise<File | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db
            .transaction(IDB_STORE_NAME, "readonly")
            .objectStore(IDB_STORE_NAME)
            .get(itemId);
        req.onsuccess = () =>
            resolve(req.result ? (req.result.file as File) : null);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteDraftPhoto(itemId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        tx.objectStore(IDB_STORE_NAME).delete(itemId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearDraftPhotos(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        tx.objectStore(IDB_STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
