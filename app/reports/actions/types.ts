export type ChecklistItemData = {
    itemId: string;
    itemName: string;
    categoryName: string;
    condition?: "BAIK" | "RUSAK" | "TIDAK_ADA";
    preventiveCondition?: "OK" | "NOT_OK" | "TIDAK_ADA";
    handler?: "BMS" | "REKANAN";
    photoUrl?: string;
    photoKey?: string;
    notes?: string;
};

import { getJakartaMonthWindow, getJakartaYearWindow } from "@/lib/time";

export type BmsEstimationData = {
    itemName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
};

export type DraftData = {
    storeCode?: string;
    storeName?: string;
    branchName?: string;
    checklistItems: ChecklistItemData[];
    bmsEstimations: Record<string, BmsEstimationData[]>;
    totalEstimation?: number;
};

export type DateRangeFilter =
    | "all"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "last_6_months"
    | "this_year"
    | "last_year"
    | "custom";

export type ReportFilters = {
    search?: string;
    status?: string | string[];
    dateRange?: DateRangeFilter;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
};

/** Returns { gte, lt } date bounds for a given DateRangeFilter value, or undefined for "all". */
export function resolveDateRange(
    range: DateRangeFilter | undefined,
): { gte: Date; lt: Date } | undefined {
    if (!range || range === "all") return undefined;

    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const y = Number(parts.find(p => p.type === 'year')!.value);
    const m = Number(parts.find(p => p.type === 'month')!.value); // 1-indexed

    switch (range) {
        case "this_week": {
            const now = new Date();
            const day = now.getDay() || 7; // 1-7 (Mon-Sun)
            const start = new Date(now);
            start.setDate(now.getDate() - day + 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return { gte: start, lt: end };
        }
        case "last_week": {
            const now = new Date();
            const day = now.getDay() || 7;
            const start = new Date(now);
            start.setDate(now.getDate() - day - 6);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return { gte: start, lt: end };
        }
        case "this_month": {
            const w = getJakartaMonthWindow(y, m);
            return { gte: w.start, lt: w.endExclusive };
        }
        case "last_month": {
            const w = getJakartaMonthWindow(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
            return { gte: w.start, lt: w.endExclusive };
        }
        case "last_3_months": {
            const wStart = getJakartaMonthWindow(m <= 3 ? y - 1 : y, m <= 3 ? m + 12 - 3 : m - 3);
            const wEnd = getJakartaMonthWindow(y, m);
            return { gte: wStart.start, lt: wEnd.endExclusive };
        }
        case "last_6_months": {
            const wStart = getJakartaMonthWindow(m <= 6 ? y - 1 : y, m <= 6 ? m + 12 - 6 : m - 6);
            const wEnd = getJakartaMonthWindow(y, m);
            return { gte: wStart.start, lt: wEnd.endExclusive };
        }
        case "this_year": {
            const w = getJakartaYearWindow(y);
            return { gte: w.start, lt: w.endExclusive };
        }
        case "last_year": {
            const w = getJakartaYearWindow(y - 1);
            return { gte: w.start, lt: w.endExclusive };
        }
    }
}

// --- Zod schemas for runtime validation ---

import { z } from "zod/v4";

const checklistItemSchema = z
    .object({
        itemId: z.string().min(1),
        itemName: z.string().min(1),
        categoryName: z.string(),
        condition: z.enum(["BAIK", "RUSAK", "TIDAK_ADA"]).optional(),
        preventiveCondition: z.enum(["OK", "NOT_OK", "TIDAK_ADA"]).optional(),
        handler: z.enum(["BMS", "REKANAN"]).optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
        notes: z.string().optional(),
    })
    .passthrough()
    .superRefine((item, ctx) => {
        const isDamaged =
            item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK";

        if (isDamaged && !item.notes?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["notes"],
                message: "Catatan wajib diisi untuk item rusak",
            });
        }
    });

const bmsEstimationSchema = z
    .object({
        itemName: z.string().min(1),
        quantity: z.number().min(0),
        unit: z.string().min(1),
        price: z.number().min(0),
        totalPrice: z.number().min(0),
    })
    .passthrough();

export const draftDataSchema = z
    .object({
        storeCode: z.string().optional(),
        storeName: z.string().optional(),
        branchName: z.string().optional(),
        checklistItems: z.array(checklistItemSchema),
        bmsEstimations: z.record(z.string(), z.array(bmsEstimationSchema)),
        totalEstimation: z.number().optional(),
    })
    .passthrough();

export const deleteDraftSchema = z.object({
    reportNumber: z.string().min(1, "Report number wajib diisi"),
});
