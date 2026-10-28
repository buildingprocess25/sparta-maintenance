import { PREVENTIVE_ITEM_IDS } from "@/lib/report-preventive";
import { SIGNAGE_ITEM_IDS } from "@/lib/signage";

export type PreventiveCooldown = {
    /** I1–I10 sudah tercatat lengkap di kuartal berjalan. */
    core: boolean;
    /** I11–I13 sudah tercatat lengkap di kuartal berjalan. */
    signage: boolean;
};

const signageIds = new Set(SIGNAGE_ITEM_IDS);
const coreIds = PREVENTIVE_ITEM_IDS.filter((id) => !signageIds.has(id));
const coreIdSet = new Set(coreIds);
const preventiveIds = new Set(PREVENTIVE_ITEM_IDS);

/**
 * Terapkan masa jeda kuartal per kelompok item I pada payload submit:
 * kelompok yang masa jeda dibuang (cegah bypass UI), kelompok yang tampil
 * wajib lengkap.
 */
export function resolvePreventiveSubmission<
    T extends { itemId: string; preventiveCondition?: string | null },
>(
    items: readonly T[],
    cooldown: PreventiveCooldown,
): { items: T[]; error?: { error: string; detail: string } } {
    const kept = items.filter(
        (item) =>
            !(cooldown.core && coreIdSet.has(item.itemId)) &&
            !(cooldown.signage && signageIds.has(item.itemId)),
    );

    const isFilled = (id: string) =>
        kept.some((item) => item.itemId === id && item.preventiveCondition);

    let requiredIds: readonly string[] = [];
    if (!cooldown.core) {
        // Kunjungan preventif triwulan: hanya bila ada item preventif dikirim.
        if (kept.some((item) => preventiveIds.has(item.itemId))) {
            requiredIds = cooldown.signage
                ? coreIds
                : [...coreIds, ...SIGNAGE_ITEM_IDS];
        }
    } else if (!cooldown.signage) {
        // Toko sudah preventif tapi signage belum: I11–I13 wajib diisi sekali.
        requiredIds = SIGNAGE_ITEM_IDS;
    }

    const missing = requiredIds.find((id) => !isFilled(id));
    if (missing) {
        return {
            items: kept,
            error: {
                error: "Data laporan tidak lengkap",
                detail: `Item preventif ${missing} wajib diisi`,
            },
        };
    }

    return { items: kept };
}
