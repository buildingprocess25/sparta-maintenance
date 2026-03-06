"use server";

import { requireAuth } from "@/lib/authorization";
import { getReportForCompletion } from "./queries";

/**
 * Client-callable server action: load full report detail for completion form.
 * Returns null if report is not accessible by the current user.
 */
export async function fetchReportForCompletion(reportNumber: string) {
    const user = await requireAuth();
    return getReportForCompletion(reportNumber, user.NIK);
}
