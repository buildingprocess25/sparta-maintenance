"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export type AdminPjumFilters = {
    search?: string;
    branchName?: string;
};

export type PjumRow = {
    id: string;
    weekNumber: number;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    fromDate: Date;
    toDate: Date;
    reportCount: number;
    status: string;
    createdAt: Date;
};

export async function getAdminPjum(
    cursor: string | null,
    limit: number = 20,
    filters: AdminPjumFilters
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            throw new Error("Unauthorized");
        }

        const where: Prisma.PjumExportWhereInput = {};

        if (filters.search) {
            // Because PjumExport doesn't have a relation to User in Prisma schema,
            // we find matching NIKs first based on the name
            const matchingUsers = await prisma.user.findMany({
                where: { name: { contains: filters.search, mode: "insensitive" } },
                select: { NIK: true }
            });
            const matchedNIKs = matchingUsers.map(u => u.NIK);

            where.OR = [
                { bmsNIK: { contains: filters.search, mode: "insensitive" } },
                ...(matchedNIKs.length > 0 ? [{ bmsNIK: { in: matchedNIKs } }] : []),
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            where.branchName = filters.branchName;
        }

        const totalCount = await prisma.pjumExport.count({ where });

        const pjumExports = await prisma.pjumExport.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                weekNumber: true,
                branchName: true,
                bmsNIK: true,
                fromDate: true,
                toDate: true,
                status: true,
                reportNumbers: true,
                createdAt: true,
            },
        });

        let nextCursor: string | null = null;
        if (pjumExports.length > limit) {
            const nextItem = pjumExports.pop();
            nextCursor = nextItem!.id;
        }

        // Fetch user names for BMS NIKs
        const nikSet = new Set<string>();
        for (const p of pjumExports) {
            nikSet.add(p.bmsNIK);
        }

        const users = await prisma.user.findMany({
            where: { NIK: { in: Array.from(nikSet) } },
            select: { NIK: true, name: true },
        });

        const nameMap = new Map(users.map((u) => [u.NIK, u.name]));

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminPjum", correlationId, durationMs, count: pjumExports.length },
            "Fetched admin PJUM successfully"
        );

        const rows: PjumRow[] = pjumExports.map((p) => ({
            id: p.id,
            weekNumber: p.weekNumber,
            branchName: p.branchName,
            bmsNIK: p.bmsNIK,
            bmsName: nameMap.get(p.bmsNIK) || p.bmsNIK,
            fromDate: p.fromDate,
            toDate: p.toDate,
            reportCount: p.reportNumbers.length,
            status: p.status,
            createdAt: p.createdAt,
        }));

        return {
            pjums: rows,
            nextCursor,
            totalCount,
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminPjum", correlationId, durationMs },
            "Failed to fetch admin PJUM",
            error
        );
        throw new Error("Failed to load PJUM");
    }
}
