"use server";

import { requireAuth } from "@/lib/authorization";
import { getReportForStartWork } from "./queries";

/**
 * Client-callable server action: load full report detail for the start-work form.
 * Returns null if report is not accessible by the current user.
 */
export async function fetchReportForStartWork(reportNumber: string) {
    const user = await requireAuth();
    return getReportForStartWork(reportNumber, user.NIK);
}
