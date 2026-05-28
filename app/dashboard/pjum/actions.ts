"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { revalidatePath } from "next/cache";
import { getGoogleDriveClient } from "@/lib/google-drive/client";
import { deletePdfSnapshots } from "@/lib/pdf/snapshot-storage";

export type AdminPjumFilters = {
    search?: string;
    branchName?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
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
    reportNumbers: string[];
    status: string;
    pjumFinalDriveUrl: string | null;
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

        const where: Prisma.PjumExportWhereInput = {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        };

        if (filters.search) {
            const search = filters.search.trim();
            // Because PjumExport doesn't have a relation to User in Prisma schema,
            // we find matching NIKs first based on the name
            const matchingUsers = await prisma.user.findMany({
                where: { name: { contains: search, mode: "insensitive" } },
                select: { NIK: true }
            });
            const matchedNIKs = matchingUsers.map(u => u.NIK);

            where.OR = [
                { bmsNIK: { contains: search, mode: "insensitive" } },
                { branchName: { contains: search, mode: "insensitive" } },
                { reportNumbers: { has: search } },
                ...(matchedNIKs.length > 0 ? [{ bmsNIK: { in: matchedNIKs } }] : []),
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            where.branchName = filters.branchName;
        }

        if (filters.status && filters.status !== "all") {
            where.status = filters.status as Prisma.EnumPjumStatusFilter["equals"];
        }

        if (filters.fromDate || filters.toDate) {
            where.createdAt = {};
            if (filters.fromDate) {
                where.createdAt.gte = new Date(filters.fromDate);
            }
            if (filters.toDate) {
                const end = new Date(filters.toDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const totalCount = await prisma.pjumExport.count({ where });

        const pjumExports = await prisma.pjumExport.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
                id: true,
                weekNumber: true,
                branchName: true,
                bmsNIK: true,
                fromDate: true,
                toDate: true,
                status: true,
                reportNumbers: true,
                pjumFinalDriveUrl: true,
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
            reportNumbers: p.reportNumbers,
            status: p.status,
            pjumFinalDriveUrl: p.pjumFinalDriveUrl,
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

export async function cancelAdminPjum(pjumExportId: string) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            throw new Error("Unauthorized");
        }

        const pjumExport = await prisma.pjumExport.findUnique({
            where: { id: pjumExportId },
            select: {
                id: true,
                branchName: true,
                bmsNIK: true,
                weekNumber: true,
                status: true,
                reportNumbers: true,
                pjumPdfPath: true,
                pjumFinalDriveUrl: true,
            },
        });

        if (!pjumExport) {
            return { error: "PJUM tidak ditemukan" };
        }

        if (pjumExport.branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
            return {
                error: "PJUM HEAD OFFICE tidak dapat dibatalkan dari dashboard admin",
            };
        }

        const deletedDriveFileIds = await deletePjumDriveFiles([
            pjumExport.pjumFinalDriveUrl,
        ]);

        if (pjumExport.pjumPdfPath) {
            await deletePdfSnapshots([pjumExport.pjumPdfPath]);
        }

        const updatedReports = await prisma.$transaction(async (tx) => {
            const reportResult = await tx.report.updateMany({
                where: {
                    reportNumber: { in: pjumExport.reportNumbers },
                    pjumExportedAt: { not: null },
                },
                data: {
                    pjumExportedAt: null,
                    reportFinalDriveUrl: null,
                },
            });

            await tx.pjumExport.delete({ where: { id: pjumExport.id } });

            return reportResult.count;
        });

        revalidatePath("/dashboard/pjum");
        revalidatePath("/dashboard/reports");
        revalidatePath("/dashboard");
        revalidatePath("/reports/pjum");
        revalidatePath(`/reports/pjum/${pjumExport.id}`);

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            {
                operation: "cancelAdminPjum",
                correlationId,
                durationMs,
                pjumExportId,
                userId: user.NIK,
                branchName: pjumExport.branchName,
                bmsNIK: pjumExport.bmsNIK,
                weekNumber: pjumExport.weekNumber,
                updatedReports,
                deletedDriveFileIds,
            },
            "Cancelled admin PJUM successfully",
        );

        return { success: true, updatedReports, deletedDriveFileIds };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "cancelAdminPjum", correlationId, durationMs, pjumExportId },
            "Failed to cancel admin PJUM",
            error,
        );
        return { error: "Gagal membatalkan PJUM" };
    }
}

async function deletePjumDriveFiles(
    urls: Array<string | null | undefined>,
): Promise<string[]> {
    const fileIds = [
        ...new Set(
            urls
                .map(extractGoogleDriveFileId)
                .filter((fileId): fileId is string => Boolean(fileId)),
        ),
    ];

    if (fileIds.length === 0) return [];

    const { drive } = getGoogleDriveClient();
    const deletedFileIds: string[] = [];

    for (const fileId of fileIds) {
        try {
            await drive.files.delete({
                fileId,
                supportsAllDrives: true,
            });
            deletedFileIds.push(fileId);
        } catch (error) {
            if (isGoogleDriveNotFoundError(error)) {
                deletedFileIds.push(fileId);
                continue;
            }

            logger.error(
                { operation: "deletePjumDriveFiles", fileId },
                "Failed to delete PJUM file from Drive",
                error,
            );
            throw new Error("Gagal menghapus dokumen PJUM dari Google Drive");
        }
    }

    return deletedFileIds;
}

function extractGoogleDriveFileId(value: string | null | undefined) {
    if (!value) return null;

    const normalized = value.trim();

    const fileViewMatch = normalized.match(
        /drive\.google\.com\/file\/d\/([^/?#]+)/,
    );
    if (fileViewMatch) return decodeURIComponent(fileViewMatch[1]);

    const openMatch = normalized.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (openMatch) return decodeURIComponent(openMatch[1]);

    const downloadMatch = normalized.match(
        /drive\.google\.com\/uc\?id=([^&]+)/,
    );
    if (downloadMatch) return decodeURIComponent(downloadMatch[1]);

    return null;
}

function isGoogleDriveNotFoundError(error: unknown) {
    if (!error || typeof error !== "object") return false;

    const candidate = error as {
        code?: number;
        status?: number;
        response?: { status?: number };
    };

    return (
        candidate.code === 404 ||
        candidate.status === 404 ||
        candidate.response?.status === 404
    );
}
