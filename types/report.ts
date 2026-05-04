/**
 * TypeScript interfaces untuk data JSON di Report.items dan Report.estimations
 * Menggantikan Prisma-generated types dari tabel ReportItem & MaterialEstimation
 */

/** Satu baris realisasi material (diisi BMS saat penyelesaian pekerjaan) */
export interface RealisasiItemJson {
    materialName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
}

/** Satu toko material tempat BMS membeli bahan */
export interface MaterialStoreJson {
    name: string;
    city: string;
    photoUrls?: string[];
}

export interface ReportItemJson {
    itemId: string; // e.g. "A1"
    itemName: string; // e.g. "Bahu Jalan"
    categoryName: string; // e.g. "A. Bagian Depan Bangunan"
    condition: "BAIK" | "RUSAK" | "TIDAK_ADA" | null;
    preventiveCondition: "OK" | "NOT_OK" | "TIDAK_ADA" | null;
    handler: "BMS" | "REKANAN" | null;
    photoUrl?: string | null; // Deprecated, use images
    images?: string[]; // New standard for multiple images
    notes?: string | null;

    // === Completion data (filled by BMS during penyelesaian pekerjaan) ===
    afterImages?: string[]; // Foto setelah perbaikan
    /** @deprecated use realisasiItems instead */
    actualCost?: number;
    /** @deprecated use materialStores instead */
    materialStoreName?: string;
    /** @deprecated use materialStores instead */
    materialStoreCity?: string;
    receiptImages?: string[]; // Foto nota/struk belanja
    realisasiItems?: RealisasiItemJson[]; // Realisasi biaya (per baris material)
    materialStores?: MaterialStoreJson[]; // Toko tempat beli material (bisa >1)
    completionNotes?: string; // Catatan saat penyelesaian (terpisah dari notes inspeksi)
}

export interface MaterialEstimationJson {
    itemId: string; // Links to ReportItemJson.itemId
    materialName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
}
