import type { DraftData } from "@/app/reports/actions";
import type {
    ChecklistCategory,
    ChecklistItem,
} from "@/lib/checklist-data";

type SerializeChecklistOptions = {
    activeOnly?: boolean;
    completedOnly?: boolean;
};

export function serializeChecklistItems(
    checklist: ReadonlyMap<string, ChecklistItem>,
    activeCategories: readonly ChecklistCategory[],
    options: SerializeChecklistOptions = {},
): DraftData["checklistItems"] {
    const categoriesByItemId = new Map(
        activeCategories.flatMap((category) =>
            category.items.map((item) => [item.id, category] as const),
        ),
    );

    return Array.from(checklist.values())
        .filter((item) => !options.completedOnly || Boolean(item.condition))
        .filter((item) => !options.activeOnly || categoriesByItemId.has(item.id))
        .map((item) => {
            const category = categoriesByItemId.get(item.id);
            const isPreventive = Boolean(category?.isPreventive);

            return {
                itemId: item.id,
                itemName: item.name,
                categoryName: category?.title ?? "",
                condition: isPreventive
                    ? undefined
                    : item.condition === "baik"
                      ? "BAIK"
                      : item.condition === "rusak"
                        ? "RUSAK"
                        : item.condition === "tidak_ada"
                          ? "TIDAK_ADA"
                          : undefined,
                preventiveCondition: isPreventive
                    ? item.condition === "baik"
                        ? "OK"
                        : item.condition === "rusak"
                          ? "NOT_OK"
                          : item.condition === "tidak_ada"
                            ? "TIDAK_ADA"
                            : undefined
                    : undefined,
                handler:
                    item.handler === "BMS"
                        ? "BMS"
                        : item.handler === "Rekanan"
                          ? "REKANAN"
                          : undefined,
                photoUrl: item.photoUrl,
                photoKey: item.photoKey,
                notes: item.notes,
                ahoTicketNumber:
                    item.condition === "rusak"
                        ? item.ahoTicketNumber?.trim() || undefined
                        : undefined,
            };
        });
}
