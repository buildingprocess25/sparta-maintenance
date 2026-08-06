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
    ahoTicketNumber?: string;
};

import { getJakartaMonthWindow, getJakartaYearWindow } from "@/lib/time";
import { REPORT_CHECKLIST_ITEMS } from "@/lib/checklist-data";

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
    /** Waktu BMS pertama kali membuka form (dari browser). Diisi oleh useDraft, dikirim saat submit. */
    draftCreatedAt?: string; // ISO 8601
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

const canonicalChecklistItemIds = new Set(
    REPORT_CHECKLIST_ITEMS.map((item) => item.id),
);

const bmsEstimationSchema = z
    .object({
        itemName: z.string().min(1).max(300),
        quantity: z.number().min(0),
        unit: z.string().min(1).max(50),
        price: z.number().min(0),
        totalPrice: z.number().min(0),
    });

function buildDraftDataSchema(allowedItemIds: ReadonlySet<string>) {
    const checklistItemSchema = z
        .object({
            itemId: z
                .string()
                .min(1)
                .refine((itemId) => allowedItemIds.has(itemId), {
                    message: "Item checklist tidak dikenal",
                }),
            itemName: z.string().min(1).max(300),
            categoryName: z.string().max(200),
            condition: z.enum(["BAIK", "RUSAK", "TIDAK_ADA"]).optional(),
            preventiveCondition: z
                .enum(["OK", "NOT_OK", "TIDAK_ADA"])
                .optional(),
            handler: z.enum(["BMS", "REKANAN"]).optional(),
            photoUrl: z.string().max(2048).optional(),
            photoKey: z.string().max(500).optional(),
            notes: z.string().max(2000).optional(),
            ahoTicketNumber: z.string().trim().max(100).optional(),
        })
        .superRefine((item, ctx) => {
            const isDamaged =
                item.condition === "RUSAK" ||
                item.preventiveCondition === "NOT_OK";

            if (isDamaged && !item.notes?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["notes"],
                    message: "Catatan wajib diisi untuk item rusak",
                });
            }
            if (isDamaged && !item.ahoTicketNumber?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["ahoTicketNumber"],
                    message: "Nomor tiket AHO wajib diisi untuk item rusak",
                });
            }
        });

    return z
        .object({
            storeCode: z.string().max(50).optional(),
            storeName: z.string().max(300).optional(),
            branchName: z.string().max(200).optional(),
            checklistItems: z
                .array(checklistItemSchema)
                .max(Math.max(1, allowedItemIds.size)),
            bmsEstimations: z.record(
                z.string(),
                z.array(bmsEstimationSchema).max(100),
            ),
            totalEstimation: z.number().min(0).optional(),
            draftCreatedAt: z.string().datetime().optional(),
        })
        .superRefine((data, ctx) => {
            const itemIds = new Set<string>();
            data.checklistItems.forEach((item, index) => {
                if (itemIds.has(item.itemId)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["checklistItems", index, "itemId"],
                        message: "Item checklist tidak boleh duplikat",
                    });
                }
                itemIds.add(item.itemId);
            });

            for (const itemId of Object.keys(data.bmsEstimations)) {
                if (!allowedItemIds.has(itemId)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["bmsEstimations", itemId],
                        message:
                            "Estimasi mengacu ke item checklist tidak dikenal",
                    });
                }
            }
        });
}

export const draftDataSchema = buildDraftDataSchema(
    canonicalChecklistItemIds,
);

export function createResubmitDataSchema(existingItemIds: ReadonlySet<string>) {
    return buildDraftDataSchema(
        new Set([...canonicalChecklistItemIds, ...existingItemIds]),
    );
}

export const deleteDraftSchema = z.object({
    reportNumber: z.string().min(1, "Report number wajib diisi"),
});
