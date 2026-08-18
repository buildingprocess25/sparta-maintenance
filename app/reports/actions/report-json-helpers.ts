import type { Prisma } from "@prisma/client";
import type { MaterialEstimationJson } from "@/types/report";
import type { DraftData } from "./types";

function cleanJsonValue(value: unknown): unknown {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
    }
    if (Array.isArray(value)) {
        const values = value
            .map(cleanJsonValue)
            .filter((entry) => entry !== undefined);
        return values.length > 0 ? values : undefined;
    }
    if (typeof value === "object") {
        const entries = Object.entries(value)
            .map(([key, entry]) => [key, cleanJsonValue(entry)] as const)
            .filter(([, entry]) => entry !== undefined);
        return entries.length > 0 ? Object.fromEntries(entries) : undefined;
    }
    return value;
}

export function cleanReportItemsJson(
    items: readonly object[],
): Prisma.InputJsonArray {
    return items
        .map((value) => {
            const item = { ...(value as Record<string, unknown>) };
            delete item.itemName;
            delete item.categoryName;
            return cleanJsonValue(item);
        })
        .filter((item): item is Record<string, unknown> => item !== undefined)
        .map((item) => item as Prisma.InputJsonObject);
}

export function buildItemsJson(data: DraftData): Prisma.InputJsonValue {
    return cleanReportItemsJson(
        data.checklistItems
            .filter((item) => item.condition || item.preventiveCondition)
            .map((item) => {
                const isDamaged =
                    item.condition === "RUSAK" ||
                    item.preventiveCondition === "NOT_OK";

                return {
                    itemId: item.itemId,
                    condition: item.condition,
                    preventiveCondition: item.preventiveCondition,
                    handler: isDamaged ? item.handler : undefined,
                    photoUrl: item.photoUrl,
                    notes: isDamaged ? item.notes : undefined,
                    ahoTicketNumber: isDamaged ? item.ahoTicketNumber?.trim() : undefined,
                };
            }),
    );
}

export function buildEstimationsJson(data: DraftData): Prisma.InputJsonValue {
    const estimations: MaterialEstimationJson[] = [];
    for (const [itemId, ests] of Object.entries(data.bmsEstimations)) {
        for (const est of ests) {
            estimations.push({
                itemId,
                materialName: est.itemName,
                quantity: est.quantity,
                unit: est.unit,
                price: est.price,
                totalPrice: est.totalPrice,
            });
        }
    }
    return estimations as unknown as Prisma.InputJsonValue;
}
