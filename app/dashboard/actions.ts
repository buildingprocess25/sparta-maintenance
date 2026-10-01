"use server";

import { getAuthUser } from "@/lib/authorization";
import { getBmsBalanceHistory, type BmsBalanceHistoryItem } from "@/lib/balance";

export async function fetchBalanceHistoryAction(): Promise<BmsBalanceHistoryItem[]> {
    const user = await getAuthUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    if (user.role !== "BMS") {
        throw new Error("Forbidden");
    }

    const history = await getBmsBalanceHistory(user.NIK);
    return history;
}

import { getAdminRealisasiDetail } from "./queries";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export async function fetchAdminRealisasiDetailAction(brand: StoreBrandFilter, period: string) {
    const user = await getAuthUser();
    if (!user) throw new Error("Unauthorized");
    const branchScope = user.role === "ADMIN" ? undefined : user.branchNames;
    return await getAdminRealisasiDetail(brand, branchScope, period);
}
