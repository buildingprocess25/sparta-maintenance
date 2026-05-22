import type { ReportItemJson } from "@/types/report";

type DecimalLike = {
    toNumber: () => number;
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

export function hasRealisasiItems(items: unknown): boolean {
    const reportItems = Array.isArray(items) ? (items as ReportItemJson[]) : [];

    for (const item of reportItems) {
        if (item.realisasiItems && item.realisasiItems.length > 0) {
            return true;
        }
    }

    return false;
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
