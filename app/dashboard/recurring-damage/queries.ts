import "server-only";

import { unstable_cache } from "next/cache";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import type {
    DamagedItemRank,
    DamagedItemSummary,
    RecurringDamageData,
    RecurringDamageFilters,
    RecurringDamagePeriod,
} from "@/lib/recurring-damage";
import {
    computeDamagedItemSummary,
    computeRecurringDamage,
    type RecurringDamageScope,
} from "./detections-query";

/**
 * Cek user dan role, lalu tentukan cakupan toko. `null` berarti user tidak
 * punya cabang.
 */
async function resolveRecurringDamageScope(
    filters: RecurringDamageFilters,
): Promise<RecurringDamageScope | null> {
    const user = await getAuthUser();
    if (
        !user ||
        (user.role !== "ADMIN" &&
            user.role !== "BMC" &&
            user.role !== "BNM_MANAGER")
    ) {
        throw new Error("Unauthorized");
    }

    if (user.role === "ADMIN") {
        return {
            branchName:
                filters.branchName && filters.branchName !== "all"
                    ? filters.branchName
                    : null,
            brand: filters.brand ?? "ALL",
        };
    }

    // BMC/BNM terikat ke satu cabang; filter cabang dan brand dari klien diabaikan.
    const branchName = user.branchNames[0];
    return branchName ? { branchName, brand: "ALL" } : null;
}

/** Periode hanya dengan key yang terisi agar key cache stabil. */
function toPeriod(filters: RecurringDamageFilters): RecurringDamagePeriod {
    return {
        year: filters.year,
        ...(filters.quarter !== undefined ? { quarter: filters.quarter } : {}),
        ...(filters.month !== undefined ? { month: filters.month } : {}),
    };
}

/**
 * Data cache Next menolak entri di atas ~2 MB, sedangkan daftar toko semua
 * cabang jauh lebih besar. Entri semua cabang hanya menyimpan ringkasan
 * cabang; entri satu cabang menyimpan toko cabang tersebut.
 */
const getRecurringDamageViewCached = unstable_cache(
    async (
        scope: RecurringDamageScope,
        period: RecurringDamagePeriod,
        itemId: string | null,
    ): Promise<RecurringDamageData> => {
        const data = await computeRecurringDamage(scope, period, itemId);
        return scope.branchName ? data : { branches: data.branches, stores: [] };
    },
    ["recurring-damage-view"],
    { revalidate: 300, tags: ["recurring-damage"] },
);

/**
 * Data untuk halaman (di-cache 5 menit). Untuk semua cabang, `stores` selalu
 * kosong; daftar toko hanya tersedia setelah satu cabang dipilih.
 */
export async function loadRecurringDamageView(
    filters: RecurringDamageFilters,
): Promise<RecurringDamageData> {
    const scope = await resolveRecurringDamageScope(filters);
    if (!scope) return { branches: [], stores: [] };

    try {
        return await getRecurringDamageViewCached(
            scope,
            toPeriod(filters),
            filters.itemId ?? null,
        );
    } catch (error) {
        logger.error(
            {
                operation: "loadRecurringDamageView",
                filters: JSON.stringify(filters),
            },
            "Failed to load recurring damage",
            error,
        );
        throw error;
    }
}

/** Data lengkap untuk export (tanpa cache), termasuk toko semua cabang. */
export async function loadRecurringDamage(
    filters: RecurringDamageFilters,
): Promise<RecurringDamageData> {
    const scope = await resolveRecurringDamageScope(filters);
    if (!scope) return { branches: [], stores: [] };

    try {
        return await computeRecurringDamage(
            scope,
            toPeriod(filters),
            filters.itemId ?? null,
        );
    } catch (error) {
        logger.error(
            {
                operation: "loadRecurringDamage",
                filters: JSON.stringify(filters),
            },
            "Failed to load recurring damage",
            error,
        );
        throw error;
    }
}

const DAMAGED_ITEM_RANKING_LIMIT = 5;

const EMPTY_DAMAGED_ITEM_SUMMARY: DamagedItemSummary = {
    items: [],
    totalDamageCount: 0,
    affectedItemCount: 0,
    affectedStoreCount: 0,
};

/** Ringkasan seluruh item kecil (±128 baris), jadi aman di-cache untuk semua cabang. */
const getDamagedItemSummaryCached = unstable_cache(
    async (
        scope: RecurringDamageScope,
        period: RecurringDamagePeriod,
    ): Promise<DamagedItemSummary> => computeDamagedItemSummary(scope, period),
    ["recurring-damage-item-summary"],
    { revalidate: 300, tags: ["recurring-damage"] },
);

/** Ringkasan kerusakan per item untuk tab "Per item" dan export-nya (di-cache 5 menit). */
export async function loadDamagedItemSummary(
    filters: RecurringDamageFilters,
): Promise<DamagedItemSummary> {
    const scope = await resolveRecurringDamageScope(filters);
    if (!scope) return EMPTY_DAMAGED_ITEM_SUMMARY;

    try {
        return await getDamagedItemSummaryCached(scope, toPeriod(filters));
    } catch (error) {
        logger.error(
            {
                operation: "loadDamagedItemSummary",
                filters: JSON.stringify(filters),
            },
            "Failed to load damaged item summary",
            error,
        );
        throw error;
    }
}

/** 5 item dengan kejadian rusak terbanyak untuk widget dashboard; memakai cache ringkasan yang sama. */
export async function loadDamagedItemRanking(
    filters: RecurringDamageFilters,
): Promise<DamagedItemRank[]> {
    const summary = await loadDamagedItemSummary(filters);
    return summary.items
        .filter((item) => item.damageCount > 0)
        .slice(0, DAMAGED_ITEM_RANKING_LIMIT);
}

/** Nama cabang cakupan user untuk label/nama file; `null` = semua cabang. */
export async function resolveRecurringDamageBranchName(
    filters: RecurringDamageFilters,
): Promise<string | null> {
    const scope = await resolveRecurringDamageScope(filters);
    return scope?.branchName ?? null;
}
