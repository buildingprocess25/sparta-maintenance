import "server-only";

import { unstable_cache } from "next/cache";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import type {
    RecurringDamageData,
    RecurringDamageFilters,
    RecurringDamagePeriod,
} from "@/lib/recurring-damage";
import {
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
    ): Promise<RecurringDamageData> => {
        const data = await computeRecurringDamage(scope, period);
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
        return await getRecurringDamageViewCached(scope, toPeriod(filters));
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
        return await computeRecurringDamage(scope, toPeriod(filters));
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
