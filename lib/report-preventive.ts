import { checklistCategories } from "@/lib/checklist-data";

const VALID_PREVENTIVE_CONDITIONS = new Set([
    "OK",
    "NOT_OK",
    "TIDAK_ADA",
]);

export const PREVENTIVE_ITEM_IDS = checklistCategories
    .filter((category) => category.isPreventive)
    .flatMap((category) => category.items.map((item) => item.id));

export function hasCompletePreventiveEvidence(items: unknown): boolean {
    if (!Array.isArray(items)) return false;

    return PREVENTIVE_ITEM_IDS.every((requiredId) =>
        items.some(
            (item) =>
                typeof item === "object" &&
                item !== null &&
                "itemId" in item &&
                "preventiveCondition" in item &&
                item.itemId === requiredId &&
                VALID_PREVENTIVE_CONDITIONS.has(
                    String(item.preventiveCondition),
                ),
        ),
    );
}

export function isRecordedPreventiveReport(input: {
    status: string;
    items: unknown;
}): boolean {
    return input.status !== "DRAFT" && hasCompletePreventiveEvidence(input.items);
}
