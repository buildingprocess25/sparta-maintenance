export type ChecklistItemData = {
    itemId: string;
    itemName: string;
    categoryName: string;
    condition?: "BAIK" | "RUSAK" | "TIDAK_ADA";
    preventiveCondition?: "OK" | "NOT_OK";
    handler?: "BMS" | "REKANAN";
    photoUrl?: string;
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

export type ReportFilters = {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
};

// --- Zod schemas for runtime validation ---

import { z } from "zod/v4";

const checklistItemSchema = z.object({
    itemId: z.string().min(1),
    itemName: z.string().min(1),
    categoryName: z.string(),
    condition: z.enum(["BAIK", "RUSAK", "TIDAK_ADA"]).optional(),
    preventiveCondition: z.enum(["OK", "NOT_OK"]).optional(),
    handler: z.enum(["BMS", "REKANAN"]).optional(),
    photoUrl: z.string().optional(),
    notes: z.string().optional(),
});

const bmsEstimationSchema = z.object({
    itemName: z.string().min(1),
    quantity: z.number().min(0),
    unit: z.string().min(1),
    price: z.number().min(0),
    totalPrice: z.number().min(0),
});

export const draftDataSchema = z.object({
    storeCode: z.string().optional(),
    storeName: z.string().optional(),
    branchName: z.string().optional(),
    checklistItems: z.array(checklistItemSchema),
    bmsEstimations: z.record(z.string(), z.array(bmsEstimationSchema)),
    totalEstimation: z.number().optional(),
});

export const deleteDraftSchema = z.object({
    reportNumber: z.string().min(1, "Report number wajib diisi"),
});
