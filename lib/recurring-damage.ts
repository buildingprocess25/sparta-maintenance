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
