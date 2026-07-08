"use server";

import { requireAuth } from "@/lib/authorization";
import { getBMSActivity, type ActivityItem } from "@/app/dashboard/queries";

export async function getBMSActivityPaginatedAction({
    search,
    action,
    limit = 20,
    cursor,
}: {
    search?: string;
    action?: string;
    limit?: number;
    cursor?: string | null;
}) {
    const user = await requireAuth();

    if (user.role !== "BMS") {
        throw new Error("Unauthorized");
    }
    
    // Fetch a large pool of activities that includes both report logs and PJUM logs
    let allItems = await getBMSActivity(user.NIK, 500);

    // Filter by action
    if (action && action !== "all") {
        allItems = allItems.filter(item => item.action === action);
    }

    // Filter by search
    if (search) {
        const q = search.toLowerCase();
        allItems = allItems.filter(item => 
            item.reportNumber.toLowerCase().includes(q) ||
            item.report.storeName?.toLowerCase().includes(q) ||
            item.report.branchName.toLowerCase().includes(q) ||
            item.actor.name.toLowerCase().includes(q)
        );
    }

    // Paginate in memory
    let startIndex = 0;
    if (cursor) {
        const idx = allItems.findIndex(item => item.id === cursor);
        if (idx !== -1) {
            startIndex = idx + 1;
        }
    }

    const paginatedItems = allItems.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allItems.length;
    const nextCursor = hasMore ? paginatedItems[paginatedItems.length - 1]?.id ?? null : null;

    return {
        items: paginatedItems,
        nextCursor,
    };
}
