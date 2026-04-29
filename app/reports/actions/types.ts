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
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "last_6_months"
    | "this_year"
    | "last_year";

export type ReportFilters = {
    search?: string;
    status?: string | string[];
    dateRange?: DateRangeFilter;
    page?: number;
    limit?: number;
};

/** Returns { gte, lt } date bounds for a given DateRangeFilter value, or undefined for "all". */
export function resolveDateRange(
    range: DateRangeFilter | undefined,
): { gte: Date; lt: Date } | undefined {
    if (!range || range === "all") return undefined;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    switch (range) {
        case "this_month":
            return { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
        case "last_month":
            return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
        case "last_3_months":
            return { gte: new Date(y, m - 3, 1), lt: new Date(y, m + 1, 1) };
        case "last_6_months":
            return { gte: new Date(y, m - 6, 1), lt: new Date(y, m + 1, 1) };
        case "this_year":
            return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
        case "last_year":
            return { gte: new Date(y - 1, 0, 1), lt: new Date(y, 0, 1) };
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
