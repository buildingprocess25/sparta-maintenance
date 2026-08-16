"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/authorization";
import type { ReportItemJson } from "@/types/report";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getReportBrandWhere, type StoreBrandFilter } from "@/lib/store-brand-filter";
import { getChecklistItemMeta } from "@/lib/checklist-data";

export type MaterialAnalysisRow = {
    id: string;
    itemName: string;
    materialName: string;
    realisasiNominal: number;
    storeCode: string;
    storeName: string;
    branchName: string;
    brand: string;
    reportNumber: string;
    bmsName: string;
    finishedAt: string; // ISO string for client
};

export type MaterialAnalysisFilters = {
    fromDate: string;
    toDate: string;
    branchName?: string;
    brand?: string;
};

export async function getAvailableBranches(): Promise<string[]> {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    // Use the exact same query as the reports page
    return fetchAllBranchNames();
}

export async function getMaterialAnalysisData(
    filters: MaterialAnalysisFilters
): Promise<MaterialAnalysisRow[]> {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const { fromDate, toDate, branchName, brand } = filters;

    const where: any = {
        status: "COMPLETED",
        finishedAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
        },
        branchName: { not: EXCLUDED_ADMIN_BRANCH_NAME },
    };

    if (branchName && branchName !== "Semua Cabang") {
        where.branchName = branchName;
    }

    if (brand && brand !== "Semua Brand") {
        const brandWhere = getReportBrandWhere(brand as StoreBrandFilter);
        if (brandWhere) {
            where.AND = [brandWhere];
        }
    }

    // Prisma query for completed reports in date range
    const reports = await prisma.report.findMany({
        where,
        include: {
            createdBy: {
                select: { name: true },
            },
            store: {
                select: { brand: true },
            }
        },
        orderBy: {
            finishedAt: "desc",
        },
    });

    const flattenedData: MaterialAnalysisRow[] = [];

    for (const report of reports) {
        const items = report.items as unknown as ReportItemJson[];
        
        if (!Array.isArray(items)) continue;

        items.forEach((item, itemIndex) => {
            if (item.realisasiItems && item.realisasiItems.length > 0) {
                item.realisasiItems.forEach((realisasi, realisasiIndex) => {
                    const nominal = realisasi.totalPrice ?? (realisasi.quantity * realisasi.price);
                    
                    const itemMeta = getChecklistItemMeta(item.itemId);
                    const itemName = item.itemName?.trim() || itemMeta?.itemName || item.itemId || "-";

                    flattenedData.push({
                        id: `${report.reportNumber}-${item.itemId || itemIndex}-${realisasiIndex}`,
                        itemName,
                        materialName: realisasi.materialName?.trim() || "-",
                        realisasiNominal: nominal,
                        storeCode: report.storeCode || "-",
                        storeName: report.storeName || "-",
                        branchName: report.branchName || "-",
                        brand: report.store?.brand || "-",
                        reportNumber: report.reportNumber,
                        bmsName: report.createdBy.name || "-",
                        finishedAt: report.finishedAt?.toISOString() || "",
                    });
                });
            }
        });
    }

    return flattenedData;
}
