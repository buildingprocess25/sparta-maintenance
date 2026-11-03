"use server";

import {
    isValidRecurringDamagePeriod,
    type DamagedItemRank,
} from "@/lib/recurring-damage";
import { loadDamagedItemRanking } from "./queries";

/** Ranking item paling sering rusak untuk widget dashboard. */
export async function getDamagedItemRanking(input: {
    year: number;
    quarter?: number;
    branchName?: string;
}): Promise<DamagedItemRank[]> {
    const period = { year: input.year, quarter: input.quarter };
    if (!isValidRecurringDamagePeriod(period)) {
        throw new Error("Periode tidak valid");
    }

    return loadDamagedItemRanking({
        ...period,
        branchName: input.branchName,
        brand: "ALL",
    });
}
