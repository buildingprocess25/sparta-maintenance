/**
 * TypeScript interfaces untuk data JSON di Report.items dan Report.estimations
 * Menggantikan Prisma-generated types dari tabel ReportItem & MaterialEstimation
 */

export interface ReportItemJson {
    itemId: string; // e.g. "A1"
    itemName: string; // e.g. "Bahu Jalan"
    categoryName: string; // e.g. "A. Bagian Depan Bangunan"
    condition: "BAIK" | "RUSAK" | "TIDAK_ADA" | null;
    preventiveCondition: "OK" | "NOT_OK" | null;
    handler: "BMS" | "REKANAN" | null;
    photoUrl: string | null;
}

export interface MaterialEstimationJson {
    itemId: string; // Links to ReportItemJson.itemId
    materialName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
}
