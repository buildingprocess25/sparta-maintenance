"use client";

import { useCallback, useRef } from "react";
import type {
    CompletionDraftData,
    CompletionItemState,
    LocalPhoto,
    RestoredDraft,
} from "../types";

// ─── IndexedDB Helpers ────────────────────────────────────────────────────────

const IDB_DB_NAME = "sparta-completion";
const IDB_STORE_NAME = "photos";
const IDB_VERSION = 1;
const LS_KEY_PREFIX = "sparta-completion-draft-";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
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

/** Delete all IDB entries whose key starts with `prefix`. */
async function idbDeleteByPrefix(prefix: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        const store = tx.objectStore(IDB_STORE_NAME);
        const range = IDBKeyRange.bound(
            prefix,
            prefix + "\uffff",
            false,
            false,
        );
        const req = store.openCursor(range);
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function genPhotoId(reportNumber: string, type: string): string {
    return `${reportNumber}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface UseCompletionAutosave {
    /**
     * Store a File in IndexedDB. Returns a LocalPhoto with a blob: preview URL.
     * Call this when the user captures/selects a photo (before submit).
     */
    addPhoto: (
        reportNumber: string,
        file: File,
        type: string,
    ) => Promise<LocalPhoto>;
    /** Delete a photo file from IndexedDB. Always call when user removes a photo. */
    removePhoto: (photoId: string) => Promise<void>;
    /**
     * Retrieve the original File by its ID.
     * Used during submit to upload photos to Supabase.
     */
    getPhotoFile: (photoId: string) => Promise<File | null>;
    /** Debounced save of all serializable form state to localStorage. */
    triggerSave: (reportNumber: string, data: CompletionDraftData) => void;
    /** Load a previously saved draft. Recreates LocalPhotos from IDB. Returns null if no draft. */
    restoreDraft: (reportNumber: string) => Promise<RestoredDraft | null>;
    /** Delete the draft from localStorage and all its photos from IDB. */
    clearDraft: (reportNumber: string) => Promise<void>;
}

export function useCompletionAutosave(): UseCompletionAutosave {
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addPhoto = useCallback(
        async (
            reportNumber: string,
            file: File,
            type: string,
        ): Promise<LocalPhoto> => {
            const id = genPhotoId(reportNumber, type);
            await idbPut(id, file);
            const previewUrl = URL.createObjectURL(file);
            return { id, previewUrl };
        },
        [],
    );

    const removePhoto = useCallback(async (photoId: string): Promise<void> => {
        await idbDelete(photoId).catch(console.error);
    }, []);

    const getPhotoFile = useCallback(
        async (photoId: string): Promise<File | null> => {
            return idbGet(photoId);
        },
        [],
    );

    const triggerSave = useCallback(
        (reportNumber: string, data: CompletionDraftData) => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                try {
                    localStorage.setItem(
                        `${LS_KEY_PREFIX}${reportNumber}`,
                        JSON.stringify(data),
                    );
                } catch (e) {
                    console.warn("Auto-save failed:", e);
                }
            }, 1500);
        },
        [],
    );

    const restoreDraft = useCallback(
        async (reportNumber: string): Promise<RestoredDraft | null> => {
            const raw = localStorage.getItem(`${LS_KEY_PREFIX}${reportNumber}`);
            if (!raw) return null;

            let draft: CompletionDraftData;
            try {
                draft = JSON.parse(raw) as CompletionDraftData;
            } catch {
                return null;
            }

            // Validate version
            if (draft.version !== 1) return null;

            // Restore selfie photos from IDB
            const selfiePhotos: LocalPhoto[] = [];
            for (const id of draft.selfiePhotoIds) {
                const file = await idbGet(id);
                if (file)
                    selfiePhotos.push({
                        id,
                        previewUrl: URL.createObjectURL(file),
                    });
            }

            // Restore item states
            const itemStates = new Map<string, CompletionItemState>();
            for (const [itemId, saved] of Object.entries(draft.itemStates)) {
                const afterPhotos: LocalPhoto[] = [];
                for (const id of saved.afterPhotoIds) {
                    const file = await idbGet(id);
                    if (file)
                        afterPhotos.push({
                            id,
                            previewUrl: URL.createObjectURL(file),
                        });
                }
                const receiptPhotos: LocalPhoto[] = [];
                for (const id of saved.receiptPhotoIds) {
                    const file = await idbGet(id);
                    if (file)
                        receiptPhotos.push({
                            id,
                            previewUrl: URL.createObjectURL(file),
                        });
                }
                itemStates.set(itemId, {
                    afterPhotos,
                    realisasiEntries: saved.realisasiEntries,
                    materialStores: saved.materialStores,
                    receiptPhotos,
                    notes: saved.notes,
                });
            }

            return {
                globalNotes: draft.globalNotes,
                selfiePhotos,
                itemStates,
            };
        },
        [],
    );

    const clearDraft = useCallback(
        async (reportNumber: string): Promise<void> => {
            localStorage.removeItem(`${LS_KEY_PREFIX}${reportNumber}`);
            await idbDeleteByPrefix(reportNumber).catch(console.error);
        },
        [],
    );

    return {
        addPhoto,
        removePhoto,
        getPhotoFile,
        triggerSave,
        restoreDraft,
        clearDraft,
    };
}
