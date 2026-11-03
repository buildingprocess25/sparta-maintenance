import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getAuthUser, type AuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import {
    buildRecurringDamageStores,
    getRecurringDamageWindow,
    summarizeRecurringDamageBranches,
    type RecurringDamageData,
    type RecurringDamageFilters,
} from "@/lib/recurring-damage";
import { getStoreBrandWhere } from "@/lib/store-brand-filter";
import { fetchDamageDetections } from "./detections-query";

/** Cakupan toko aktif per role; `null` berarti user tidak punya cabang. */
function getStoreScope(
    user: AuthUser,
    filters: RecurringDamageFilters,
): Prisma.StoreWhereInput | null {
    if (user.role === "ADMIN") {
        const branchName =
            filters.branchName && filters.branchName !== "all"
                ? filters.branchName
                : undefined;
        const brandWhere = filters.brand
            ? getStoreBrandWhere(filters.brand)
            : undefined;

        return {
            branchName: {
                not: EXCLUDED_ADMIN_BRANCH_NAME,
                ...(branchName ? { equals: branchName } : {}),
            },
            ...(brandWhere ?? {}),
        };
    }

    // BMC/BNM terikat ke satu cabang; filter cabang dari klien diabaikan.
    const branchName = user.branchNames[0];
    return branchName ? { branchName } : null;
}

export async function loadRecurringDamage(
    filters: RecurringDamageFilters,
): Promise<RecurringDamageData> {
    const user = await getAuthUser();
    if (
        !user ||
        (user.role !== "ADMIN" &&
            user.role !== "BMC" &&
            user.role !== "BNM_MANAGER")
    ) {
        throw new Error("Unauthorized");
    }

    const scope = getStoreScope(user, filters);
    if (!scope) return { branches: [], stores: [] };

    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true, ...scope },
            select: { code: true, name: true, branchName: true },
        });

        const { start, endExclusive } = getRecurringDamageWindow(filters);
        const detections = await fetchDamageDetections({
            stores,
            start,
            endExclusive,
        });
        const recurringStores = buildRecurringDamageStores(detections);
        const branchNames = [...new Set(stores.map((store) => store.branchName))];

        return {
            branches: summarizeRecurringDamageBranches(branchNames, recurringStores),
            stores: recurringStores,
        };
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
