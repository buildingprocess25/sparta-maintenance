import type { ChecklistCategory } from "@/lib/checklist-data";

type PreventiveVisibilityState = {
    /** I1–I10 sudah tercatat di kuartal berjalan. */
    coreCooling: boolean;
    /** I11–I13 sudah tercatat di kuartal berjalan. */
    signageCooling: boolean;
    isEditMode: boolean;
    /** Item yang sudah ada di checklist (laporan yang sedang diedit). */
    checklistItemIds: ReadonlySet<string>;
};

/**
 * Item kategori I yang tampil: I1–I10 dan I11–I13 punya masa jeda kuartal
 * sendiri. Saat edit/revisi, kelompok yang masa jeda tetap tampil bila laporan
 * sudah berisi item kelompok itu, agar data lama bisa direvisi.
 */
export function filterActiveCategories(
    categories: readonly ChecklistCategory[],
    state: PreventiveVisibilityState,
): ChecklistCategory[] {
    return categories.flatMap((category) => {
        if (!category.isPreventive) return [category];

        const isGroupVisible = (isSignage: boolean) => {
            const cooling = isSignage ? state.signageCooling : state.coreCooling;
            if (!cooling) return true;
            if (!state.isEditMode) return false;
            return category.items.some(
                (item) =>
                    Boolean(item.signage) === isSignage &&
                    state.checklistItemIds.has(item.id),
            );
        };

        const showCore = isGroupVisible(false);
        const showSignage = isGroupVisible(true);
        if (showCore && showSignage) return [category];

        const items = category.items.filter((item) =>
            item.signage ? showSignage : showCore,
        );
        return items.length > 0 ? [{ ...category, items }] : [];
    });
}
