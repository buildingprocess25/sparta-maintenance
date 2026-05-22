/**
 * Shared types for the completion form.
 * Imported by completion-item-card, completion-checklist-step, complete-form, and the autosave hook.
 */

import type { MaterialEstimationJson } from "@/types/report";

// ─── Photo ───────────────────────────────────────────────────────────────────

/**
 * A photo that is stored locally in IndexedDB (not yet uploaded to Supabase).
 * `previewUrl` is a blob: URL created via URL.createObjectURL() for display.
 * `id` is the IndexedDB key — used to retrieve the File for upload on submit.
 */
export interface LocalPhoto {
    id: string;
    previewUrl: string;
}

// ─── Realisasi ───────────────────────────────────────────────────────────────

export interface RealisasiEntry {
    id: string; // client-only ID (cuid-like)
    materialName: string;
    quantity: number;
    unit: string;
    price: number | null; // harga aktual per satuan; null = belum diisi
}

export function realisasiTotal(entry: RealisasiEntry): number {
    return entry.price === null ? 0 : entry.quantity * entry.price;
}

export function realisasiGrandTotal(entries: RealisasiEntry[]): number {
    return entries.reduce((s, e) => s + realisasiTotal(e), 0);
}

export function realisasiNetTotal(
    entries: RealisasiEntry[],
    discountAmount: number,
): number {
    return Math.max(0, realisasiGrandTotal(entries) - discountAmount);
}

export function hasActualPrice(entry: RealisasiEntry): boolean {
    return entry.price !== null;
}

// ─── Toko Material ───────────────────────────────────────────────────────────

export interface MaterialStoreEntry {
    id: string;
    name: string;
    city: string;
}

// ─── Item State ───────────────────────────────────────────────────────────────

export interface CompletionItemState {
    afterPhotos: LocalPhoto[];
    realisasiEntries: RealisasiEntry[];
    discountAmount: number;
    materialStores: MaterialStoreEntry[];
    receiptPhotos: LocalPhoto[];
    /** Catatan penyelesaian — selalu kosong awalnya, bukan dari data laporan */
    notes: string;
}

/** Build initial item state for a newly loaded/selected report. */
export function createInitialItemState(
    estimations: MaterialEstimationJson[],
): CompletionItemState {
    return {
        afterPhotos: [],
        realisasiEntries: estimations.map((e) => ({
            id: `init-${e.itemId}-${Math.random().toString(36).slice(2, 7)}`,
            materialName: e.materialName,
            quantity: e.quantity,
            unit: e.unit,
            price: null,
        })),
        discountAmount: 0,
        materialStores:
            estimations.length > 0
                ? [{ id: `store-${Date.now()}`, name: "", city: "" }]
                : [],
        receiptPhotos: [],
        notes: "",
    };
}

// ─── Draft (for autosave) ────────────────────────────────────────────────────

export interface DraftItemState {
    afterPhotoIds: string[];
    realisasiEntries: RealisasiEntry[];
    discountAmount?: number;
    materialStores: MaterialStoreEntry[];
    receiptPhotoIds: string[];
    notes: string;
}

export interface CompletionDraftData {
    version: 2;
    reportNumber: string;
    savedAt: string;
    globalNotes: string;
    selfiePhotoIds: string[];
    additionalDocumentationPhotoIds?: string[];
    additionalDocumentationNote?: string;
    itemStates: Record<string, DraftItemState>;
}

// ─── Restored Draft ──────────────────────────────────────────────────────────

export interface RestoredDraft {
    globalNotes: string;
    selfiePhotos: LocalPhoto[];
    additionalDocumentationPhotos: LocalPhoto[];
    additionalDocumentationNote: string;
    itemStates: Map<string, CompletionItemState>;
}
