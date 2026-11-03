import {
    compareChecklistItemIds,
    resolveChecklistItemMeta,
} from "@/lib/checklist-data";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import {
    getJakartaMonthWindow,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
} from "@/lib/time";

export type RecurringDamageQuarter = 1 | 2 | 3 | 4;

export type RecurringDamagePeriod = {
    year: number;
    quarter?: RecurringDamageQuarter;
    month?: number;
};

export type RecurringDamageFilters = RecurringDamagePeriod & {
    branchName?: string;
    brand?: StoreBrandFilter;
};

/** Laporan dengan status ini tidak dihitung sebagai deteksi kerusakan. */
export const RECURRING_DAMAGE_EXCLUDED_STATUSES = [
    "DRAFT",
    "ARCHIVED_PREVENTIVE",
    "ESTIMATION_REJECTED",
] as const;

const excludedStatuses = new Set<string>(RECURRING_DAMAGE_EXCLUDED_STATUSES);

export function isRecurringDamageCountedStatus(status: string): boolean {
    return !excludedStatuses.has(status);
}

/**
 * Rusak = item A–H `RUSAK` atau item I `NOT_OK`. Signage Pudar/Rusak sudah
 * tersimpan sebagai `NOT_OK`, Kotor sebagai `OK`.
 */
export function isDamagedItem(item: {
    condition?: string | null;
    preventiveCondition?: string | null;
}): boolean {
    return item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK";
}

export const RECURRING_DAMAGE_QUARTER_MONTHS: Record<
    RecurringDamageQuarter,
    readonly number[]
> = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
};

export const RECURRING_DAMAGE_MONTH_LABELS: readonly string[] = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

export function isRecurringDamageQuarter(
    value: unknown,
): value is RecurringDamageQuarter {
    return value === 1 || value === 2 || value === 3 || value === 4;
}

/** Bulan hanya valid bila kuartal dipilih dan bulan berada di kuartal itu. */
export function isValidRecurringDamagePeriod(period: {
    year: number;
    quarter?: number;
    month?: number;
}): period is RecurringDamagePeriod {
    if (!Number.isInteger(period.year) || period.year < 2000 || period.year > 2200) {
        return false;
    }
    if (period.quarter === undefined) return period.month === undefined;
    if (!isRecurringDamageQuarter(period.quarter)) return false;
    return (
        period.month === undefined ||
        RECURRING_DAMAGE_QUARTER_MONTHS[period.quarter].includes(period.month)
    );
}

/** Dari query string halaman: nilai yang tidak valid dibuang, bukan ditolak. */
export function normalizeRecurringDamagePeriod(
    raw: { year?: string; quarter?: string; month?: string },
    currentYear: number,
): RecurringDamagePeriod {
    const rawYear = Number(raw.year);
    const year =
        Number.isInteger(rawYear) && rawYear >= 2020 && rawYear <= currentYear + 1
            ? rawYear
            : currentYear;

    const quarter = Number(raw.quarter);
    if (!isRecurringDamageQuarter(quarter)) return { year };

    const month = Number(raw.month);
    return RECURRING_DAMAGE_QUARTER_MONTHS[quarter].includes(month)
        ? { year, quarter, month }
        : { year, quarter };
}

export function getRecurringDamageWindow(period: RecurringDamagePeriod): {
    start: Date;
    endExclusive: Date;
} {
    if (period.month !== undefined) {
        return getJakartaMonthWindow(period.year, period.month);
    }
    if (period.quarter !== undefined) {
        return getJakartaQuarterWindow(period.year, period.quarter);
    }
    return getJakartaYearWindow(period.year);
}

export function formatRecurringDamagePeriod(period: RecurringDamagePeriod): string {
    if (period.month !== undefined) {
        return `${RECURRING_DAMAGE_MONTH_LABELS[period.month - 1]} ${period.year}`;
    }
    if (period.quarter !== undefined) {
        return `Triwulan ${period.quarter} ${period.year}`;
    }
    return `Tahun ${period.year}`;
}

/** Satu entri item rusak dari satu laporan (hasil query). */
export type DamageDetection = {
    branchName: string;
    storeCode: string;
    storeName: string;
    reportNumber: string;
    createdAt: string;
    status: string;
    itemId: string;
    condition: string | null;
    preventiveCondition: string | null;
    handler: string | null;
    notes: string | null;
    signageCondition: string | null;
    signageMaterial: string | null;
};

export type RecurringDamageDetection = {
    reportNumber: string;
    createdAt: string;
    status: string;
    handler: string | null;
    notes: string | null;
    signageCondition: string | null;
    signageMaterial: string | null;
};

export type RecurringDamageItem = {
    itemId: string;
    itemName: string;
    categoryName: string;
    count: number;
    detections: RecurringDamageDetection[];
};

export type RecurringDamageStore = {
    branchName: string;
    storeCode: string;
    storeName: string;
    maxFrequency: number;
    topItemId: string;
    topItemName: string;
    recurringItemCount: number;
    items: RecurringDamageItem[];
};

export type RecurringDamageBranchSummary = {
    branchName: string;
    problematicStoreCount: number;
};

export type RecurringDamageData = {
    branches: RecurringDamageBranchSummary[];
    stores: RecurringDamageStore[];
};

type StoreAccumulator = {
    branchName: string;
    storeName: string;
    reportsByItem: Map<string, Map<string, RecurringDamageDetection>>;
};

/**
 * Kelompokkan deteksi per toko dan item, ambil item dengan ≥ 2 laporan, lalu
 * urutkan toko: frekuensi maksimum, jumlah item berulang, kode toko.
 */
export function buildRecurringDamageStores(
    detections: readonly DamageDetection[],
): RecurringDamageStore[] {
    const byStore = new Map<string, StoreAccumulator>();

    for (const detection of detections) {
        if (!isDamagedItem(detection)) continue;
        if (!isRecurringDamageCountedStatus(detection.status)) continue;

        let store = byStore.get(detection.storeCode);
        if (!store) {
            store = {
                branchName: detection.branchName,
                storeName: detection.storeName,
                reportsByItem: new Map(),
            };
            byStore.set(detection.storeCode, store);
        }

        let reports = store.reportsByItem.get(detection.itemId);
        if (!reports) {
            reports = new Map();
            store.reportsByItem.set(detection.itemId, reports);
        }

        if (!reports.has(detection.reportNumber)) {
            reports.set(detection.reportNumber, {
                reportNumber: detection.reportNumber,
                createdAt: detection.createdAt,
                status: detection.status,
                handler: detection.handler,
                notes: detection.notes,
                signageCondition: detection.signageCondition,
                signageMaterial: detection.signageMaterial,
            });
        }
    }

    const stores: RecurringDamageStore[] = [];

    for (const [storeCode, store] of byStore) {
        const items: RecurringDamageItem[] = [...store.reportsByItem]
            .filter(([, reports]) => reports.size >= 2)
            .map(([itemId, reports]) => {
                const meta = resolveChecklistItemMeta({ itemId });
                const itemDetections = [...reports.values()].sort(
                    (a, b) =>
                        a.createdAt.localeCompare(b.createdAt) ||
                        a.reportNumber.localeCompare(b.reportNumber),
                );
                return {
                    itemId,
                    itemName: meta.itemName,
                    categoryName: meta.categoryName,
                    count: itemDetections.length,
                    detections: itemDetections,
                };
            })
            .sort(
                (a, b) =>
                    b.count - a.count || compareChecklistItemIds(a.itemId, b.itemId),
            );

        if (items.length === 0) continue;

        const [topItem] = items;
        stores.push({
            branchName: store.branchName,
            storeCode,
            storeName: store.storeName,
            maxFrequency: topItem.count,
            topItemId: topItem.itemId,
            topItemName: topItem.itemName,
            recurringItemCount: items.length,
            items,
        });
    }

    return stores.sort(
        (a, b) =>
            b.maxFrequency - a.maxFrequency ||
            b.recurringItemCount - a.recurringItemCount ||
            a.storeCode.localeCompare(b.storeCode),
    );
}

/** Jumlah toko problematik per cabang; cabang tanpa toko problematik tetap 0. */
export function summarizeRecurringDamageBranches(
    branchNames: readonly string[],
    stores: readonly RecurringDamageStore[],
): RecurringDamageBranchSummary[] {
    const counts = new Map<string, number>(branchNames.map((name) => [name, 0]));
    for (const store of stores) {
        counts.set(store.branchName, (counts.get(store.branchName) ?? 0) + 1);
    }

    return [...counts]
        .map(([branchName, problematicStoreCount]) => ({
            branchName,
            problematicStoreCount,
        }))
        .sort(
            (a, b) =>
                b.problematicStoreCount - a.problematicStoreCount ||
                a.branchName.localeCompare(b.branchName),
        );
}
