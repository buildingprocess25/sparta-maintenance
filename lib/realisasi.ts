import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

type DecimalLike = {
    toNumber: () => number;
};

export type RealisasiDanaTaktisRow = {
    /** Nama material */
    material: string;
    unit: string;
    /** Qty & total dari estimasi (untuk referensi kolom estimasi) */
    estQty: number;
    estPrice: number;
    estTotal: number;
    /** Qty & total dari realisasi aktual (satu baris per realisasiItem) */
    realQty: number;
    realPrice: number;
    realTotal: number;
};

export type RealisasiDanaTaktisSummary = {
    /** Flat list — satu baris per realisasiItem dari setiap item, tidak digabung */
    visibleRows: RealisasiDanaTaktisRow[];
    totalEstimasi: number;
    totalRealisasiBeforeDiscount: number;
    totalDiscount: number;
    totalRealisasi: number;
    selisih: number;
};

function toFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toNumber" in value &&
        typeof (value as DecimalLike).toNumber === "function"
    ) {
        const parsed = (value as DecimalLike).toNumber();
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function calculateTotalRealisasiFromItems(items: unknown): number {
    const reportItems = Array.isArray(items) ? (items as ReportItemJson[]) : [];
    let totalRealisasi = 0;

    for (const item of reportItems) {
        totalRealisasi += calculateItemRealisasiTotal(item);
    }

    return totalRealisasi;
}

export function calculateItemRealisasiTotal(item: ReportItemJson): number {
    const subtotal = (item.realisasiItems ?? []).reduce(
        (sum, realisasi) =>
            sum + (realisasi.totalPrice ?? realisasi.quantity * realisasi.price),
        0,
    );
    const discount =
        typeof item.discountAmount === "number" &&
        Number.isFinite(item.discountAmount)
            ? Math.max(0, item.discountAmount)
            : 0;

    return Math.max(0, subtotal - discount);
}

/**
 * Lookup key untuk estimasi: itemId + materialName + unit.
 * Menggabungkan itemId agar kolom estimasi hanya terisi pada baris realisasi
 * yang itemnya memang memiliki estimasi material tersebut.
 */
function estimationKey(itemId: string, materialName: string, unit: string): string {
    return `${itemId}::${materialName.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

/**
 * Membangun data tabel REALISASI DANA TAKTIS.
 *
 * Setiap baris di `visibleRows` merepresentasikan SATU entri realisasiItem
 * dari satu item laporan — baris TIDAK digabung meski material sama.
 * Kolom estimasi (estQty, estPrice, estTotal) diisi dari aggregat estimasi
 * berdasarkan materialName + unit sebagai referensi perbandingan.
 *
 * Total realisasi dihitung dari semua item (termasuk potongan harga per item).
 */
export function buildRealisasiDanaTaktisSummary(
    items: ReportItemJson[],
    estimations: MaterialEstimationJson[],
): RealisasiDanaTaktisSummary {
    // Bangun lookup estimasi: key (itemId::material::unit) → {estQty, estPrice, estTotal}
    // Menggunakan itemId agar hanya item yang benar-benar diestimasi yang mendapat nilai estimasi.
    const estMap = new Map<
        string,
        { estQty: number; estPrice: number; estTotal: number }
    >();
    for (const est of estimations) {
        const key = estimationKey(est.itemId, est.materialName, est.unit);
        const existing = estMap.get(key);
        if (existing) {
            existing.estQty += est.quantity;
            existing.estTotal += est.totalPrice;
            existing.estPrice =
                existing.estQty > 0
                    ? existing.estTotal / existing.estQty
                    : est.price;
        } else {
            estMap.set(key, {
                estQty: est.quantity,
                estPrice: est.price,
                estTotal: est.totalPrice,
            });
        }
    }

    // Flat list: satu baris per realisasiItem dari tiap item
    const visibleRows: RealisasiDanaTaktisRow[] = [];
    for (const item of items) {
        for (const realisasi of item.realisasiItems ?? []) {
            const rowTotal =
                realisasi.totalPrice ?? realisasi.quantity * realisasi.price;

            // Kolom estimasi dari lookup per-item: hanya terisi jika item ini
            // memang memiliki estimasi untuk material tersebut.
            const key = estimationKey(item.itemId, realisasi.materialName, realisasi.unit);
            const est = estMap.get(key);

            visibleRows.push({
                material: realisasi.materialName.trim(),
                unit: realisasi.unit.trim(),
                estQty: est?.estQty ?? 0,
                estPrice: est?.estPrice ?? 0,
                estTotal: est?.estTotal ?? 0,
                realQty: realisasi.quantity,
                realPrice: realisasi.price,
                realTotal: rowTotal,
            });
        }
    }

    const totalRealisasiBeforeDiscount = visibleRows.reduce(
        (sum, row) => sum + row.realTotal,
        0,
    );
    // Total estimasi dihitung dari estimasi yang terpakai (ada di visibleRows)
    const totalEstimasi = Array.from(estMap.values()).reduce(
        (sum, e) => sum + e.estTotal,
        0,
    );
    // Total realisasi yang benar: memperhitungkan potongan harga per item
    const totalRealisasi = calculateTotalRealisasiFromItems(items);
    const totalDiscount = Math.max(
        0,
        totalRealisasiBeforeDiscount - totalRealisasi,
    );

    return {
        visibleRows,
        totalEstimasi,
        totalRealisasiBeforeDiscount,
        totalDiscount,
        totalRealisasi,
        selisih: totalEstimasi - totalRealisasi,
    };
}

export function hasRealisasiItems(items: unknown): boolean {
    const reportItems = Array.isArray(items) ? (items as ReportItemJson[]) : [];

    for (const item of reportItems) {
        if (item.realisasiItems && item.realisasiItems.length > 0) {
            return true;
        }
    }

    return false;
}

export function hasBmsHandledItems(items: unknown): boolean {
    const reportItems = Array.isArray(items) ? (items as ReportItemJson[]) : [];

    return reportItems.some((item) => item.handler === "BMS");
}

export function requiresPjum(totalReal: unknown, items: unknown): boolean {
    return (
        resolveReportTotalRealisasi(totalReal, items) > 0 ||
        hasBmsHandledItems(items)
    );
}

export function resolveReportTotalRealisasi(
    totalReal: unknown,
    items: unknown,
): number {
    const fromColumn = toFiniteNumber(totalReal);
    if (fromColumn !== null) {
        return fromColumn;
    }

    return calculateTotalRealisasiFromItems(items);
}
