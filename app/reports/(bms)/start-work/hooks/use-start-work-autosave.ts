"use client";

import { useCallback, useRef } from "react";

const IDB_DB_NAME = "sparta-start-work";
const IDB_STORE_NAME = "photos";
const IDB_VERSION = 1;
const LS_KEY_PREFIX = "sparta-start-work-draft-";

export type StartWorkLocalPhoto = {
    id: string;
    previewUrl: string;
    file: File;
    fileId?: string;
};

export type StartWorkMaterialStoreDraft = {
    id: string;
    name: string;
    city: string;
};

export type StartWorkDraftData = {
    version: 1;
    reportNumber: string;
    savedAt: string;
    selfiePhotoIds: string[];
    materialStorePhotoIds: string[];
    receiptPhotoIds: string[];
    materialStores: StartWorkMaterialStoreDraft[];
    skipPhotos: boolean;
};

export type RestoredStartWorkDraft = {
    selfiePhotos: StartWorkLocalPhoto[];
    materialStorePhotos: StartWorkLocalPhoto[];
    receiptPhotos: StartWorkLocalPhoto[];
    materialStores: StartWorkMaterialStoreDraft[];
    skipPhotos: boolean;
};

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

async function idbPut(id: string, file: File): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        tx.objectStore(IDB_STORE_NAME).put({ id, file });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function idbGet(id: string): Promise<File | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db
            .transaction(IDB_STORE_NAME, "readonly")
            .objectStore(IDB_STORE_NAME)
            .get(id);
        req.onsuccess = () =>
            resolve(req.result ? (req.result.file as File) : null);
        req.onerror = () => reject(req.error);
    });
}

async function idbDelete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        tx.objectStore(IDB_STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function idbDeleteByPrefix(prefix: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        const store = tx.objectStore(IDB_STORE_NAME);
        const range = IDBKeyRange.bound(
            prefix,
            `${prefix}\uffff`,
            false,
            false,
        );
        const req = store.openCursor(range);
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) return;
            cursor.delete();
            cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function genPhotoId(reportNumber: string, type: string): string {
    return `${reportNumber}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function restorePhotos(ids: string[]): Promise<StartWorkLocalPhoto[]> {
    const photos: StartWorkLocalPhoto[] = [];
    for (const id of ids) {
        const file = await idbGet(id);
        if (!file) continue;
        photos.push({
            id,
            file,
            previewUrl: URL.createObjectURL(file),
        });
    }
    return photos;
}

export function useStartWorkAutosave() {
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addPhoto = useCallback(
        async (
            reportNumber: string,
            file: File,
            type: string,
        ): Promise<StartWorkLocalPhoto> => {
            const id = genPhotoId(reportNumber, type);
            await idbPut(id, file);
            return {
                id,
                file,
                previewUrl: URL.createObjectURL(file),
            };
        },
        [],
    );

    const removePhoto = useCallback(async (photoId: string): Promise<void> => {
        await idbDelete(photoId).catch(console.error);
    }, []);

    const triggerSave = useCallback(
        (reportNumber: string, data: StartWorkDraftData) => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                try {
                    localStorage.setItem(
                        `${LS_KEY_PREFIX}${reportNumber}`,
                        JSON.stringify(data),
                    );
                } catch (error) {
                    console.warn("Start-work autosave failed:", error);
                }
            }, 1000);
        },
        [],
    );

    const restoreDraft = useCallback(
        async (
            reportNumber: string,
        ): Promise<RestoredStartWorkDraft | null> => {
            const raw = localStorage.getItem(`${LS_KEY_PREFIX}${reportNumber}`);
            if (!raw) return null;

            let draft: StartWorkDraftData;
            try {
                draft = JSON.parse(raw) as StartWorkDraftData;
            } catch {
                return null;
            }

            if (draft.version !== 1) return null;

            const [selfiePhotos, materialStorePhotos, receiptPhotos] =
                await Promise.all([
                    restorePhotos(draft.selfiePhotoIds),
                    restorePhotos(draft.materialStorePhotoIds),
                    restorePhotos(draft.receiptPhotoIds),
                ]);

            return {
                selfiePhotos,
                materialStorePhotos,
                receiptPhotos,
                materialStores: draft.materialStores ?? [],
                skipPhotos: draft.skipPhotos,
            };
        },
        [],
    );

    const clearDraft = useCallback(async (reportNumber: string) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        localStorage.removeItem(`${LS_KEY_PREFIX}${reportNumber}`);
        await idbDeleteByPrefix(reportNumber).catch(console.error);
    }, []);

    return {
        addPhoto,
        removePhoto,
        triggerSave,
        restoreDraft,
        clearDraft,
    };
}
