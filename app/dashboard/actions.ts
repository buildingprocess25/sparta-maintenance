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
