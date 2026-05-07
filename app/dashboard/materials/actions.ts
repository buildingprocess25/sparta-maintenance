"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import type { MaterialEstimationJson } from "@/types/report";

export type AdminMaterialFilters = {
    search?: string;
    bmsQuery?: string;
    branchName?: string;
};

export type MaterialRow = {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    materialName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
};

export async function getAdminMaterials(
    cursor: string | null,
    limit: number = 20,
    filters: AdminMaterialFilters
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            throw new Error("Unauthorized");
        }

        const where: Prisma.ReportWhereInput = {
            status: { not: "DRAFT" },
        };

        // For search, we can search reportNumber, storeName, storeCode.
        // Prisma can't easily search inside JSON array (estimations) cross-database safely without raw SQL in standard API, 
        // but we'll try our best. We'll search report fields, and handle materialName filtering in memory if needed, 
        // but for simplicity we'll just filter report level. If we want materialName search in DB, we'd use raw SQL or stringContains on JSON string.
        // Using string_contains on JSON is possible via Prisma `array_contains` or `string_contains` on Postgres JSONB. 
        // To keep it simple and safe, we do string_contains on the JSON field.
        if (filters.search) {
            where.OR = [
                { reportNumber: { contains: filters.search, mode: "insensitive" } },
                { storeName: { contains: filters.search, mode: "insensitive" } },
                { storeCode: { contains: filters.search, mode: "insensitive" } },
                {
                    estimations: {
                        array_contains: [{ materialName: filters.search }] as any // This might not work perfectly with partial match, so we fallback to raw or memory
                    }
                }
            ];
            // Since Prisma JSON filtering for partial match inside an array of objects is very limited,
            // we will fetch based on report/store search, and THEN filter in memory for materialName.
            // Let's remove JSON search from DB to avoid crash and do in-memory search for materialName.
            where.OR = [
                { reportNumber: { contains: filters.search, mode: "insensitive" } },
                { storeName: { contains: filters.search, mode: "insensitive" } },
                { storeCode: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.bmsQuery) {
            where.OR = [
                ...(where.OR || []),
                { createdByNIK: { contains: filters.bmsQuery, mode: "insensitive" } },
                { createdBy: { name: { contains: filters.bmsQuery, mode: "insensitive" } } },
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            where.branchName = filters.branchName;
        }

        // We only want reports that HAVE estimations. We can check if estimations is not null, 
        // but Prisma json filtering is strict. We just fetch and filter empty ones in memory.

        // Calculate total unique materials from ALL reports matching the filter
        const allEstimations = await prisma.report.findMany({
            where,
            select: { estimations: true },
        });

        const uniqueMaterialsSet = new Set<string>();
        for (const report of allEstimations) {
            const items = report.estimations as unknown as MaterialEstimationJson[];
            if (!Array.isArray(items)) continue;
            for (const item of items) {
                if (item?.materialName) {
                    // Apply in-memory search filter for materialName if search exists
                    if (filters.search) {
                        const searchLower = filters.search.toLowerCase();
                        if (!item.materialName.toLowerCase().includes(searchLower)) {
                            continue;
                        }
                    }
                    uniqueMaterialsSet.add(item.materialName.trim().toLowerCase());
                }
            }
        }
        const totalUniqueCount = uniqueMaterialsSet.size;

        const reports = await prisma.report.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { reportNumber: cursor } : undefined,
            orderBy: { updatedAt: "desc" },
            select: {
                reportNumber: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                createdByNIK: true,
                createdBy: {
                    select: {
                        name: true,
                    },
                },
                estimations: true,
            },
        });

        let nextCursor: typeof cursor = null;
        if (reports.length > limit) {
            const nextItem = reports.pop();
            nextCursor = nextItem!.reportNumber;
        }

        const materials: MaterialRow[] = [];

        for (const report of reports) {
            const items = (report.estimations as unknown) as MaterialEstimationJson[];
            if (!Array.isArray(items) || items.length === 0) continue;

            for (const item of items) {
                // If there's a search term, and it didn't match report fields, check materialName
                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    const matchReport = 
                        report.reportNumber.toLowerCase().includes(searchLower) ||
                        report.storeName.toLowerCase().includes(searchLower) ||
                        (report.storeCode && report.storeCode.toLowerCase().includes(searchLower));
                    
                    const matchMaterial = item.materialName.toLowerCase().includes(searchLower);

                    if (!matchReport && !matchMaterial) {
                        continue;
                    }
                }

                materials.push({
                    reportNumber: report.reportNumber,
                    storeName: report.storeName,
                    storeCode: report.storeCode,
                    branchName: report.branchName,
                    bmsNIK: report.createdByNIK,
                    bmsName: report.createdBy.name,
                    materialName: item.materialName,
                    quantity: Number(item.quantity || 0),
                    unit: item.unit || "",
                    price: Number(item.price || 0),
                    totalPrice: Number(item.totalPrice || 0),
                });
            }
        }

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminMaterials", correlationId, durationMs, count: materials.length },
            "Fetched admin materials successfully"
        );

        return {
            materials,
            nextCursor,
            totalUniqueCount,
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminMaterials", correlationId, durationMs },
            "Failed to fetch admin materials",
            error
        );
        throw new Error("Failed to load materials");
    }
}
