"use server";

import prisma from "@/lib/prisma";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { ReportItemJson } from "@/types/report";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import {
    buildPjumSnapshotPath,
    uploadPdfSnapshot,
} from "@/lib/pdf/snapshot-storage";

export type PjumBmsUser = {
    NIK: string;
    name: string;
};

export type PjumReportRow = {
    reportNumber: string;
    finishedAt: string; // ISO string
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    totalRealisasi: number;
    pjumExportedAt: string | null; // ISO string or null
};

export type PjumBlockedRange = {
    id: string;
    fromDate: string; // ISO string
    toDate: string; // ISO string
    status: string;
};

export type PjumHistoryRow = {
    id: string;
    status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    bmsNIK: string;
    bmsName: string;
    branchName: string;
    weekNumber: number;
    fromDate: string;
    toDate: string;
    reportNumbers: string[];
    reportCount: number;
    totalRealisasi: number;
    createdAt: string;
    approvedAt: string | null;
    approvedByName: string | null;
    rejectionNotes: string | null;
    pjumFinalDriveUrl: string | null;
};

const exportSchema = z.object({
    reportNumbers: z.array(z.string().min(1)).min(1, "Pilih minimal 1 laporan"),
    bmsNIK: z.string().min(1, "BMS wajib dipilih"),
    from: z.string().min(1, "Tanggal mulai wajib diisi"),
    to: z.string().min(1, "Tanggal akhir wajib diisi"),
    weekNumber: z
        .number()
        .int("Minggu ke harus angka bulat")
        .min(1, "Minggu ke minimal 1")
        .max(5, "Minggu ke maksimal 5"),
});

const SEARCHABLE_PJUM_STATUSES = [
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
    "COMPLETED",
] as const;

const NON_COMPLETED_PJUM_STATUSES = [
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

type PjumReportCandidate = {
    reportNumber: string;
    createdAt: Date;
    finishedAt: Date | null;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    items: unknown;
    pjumExportedAt: Date | null;
};

function getPjumFilterDate(report: PjumReportCandidate): Date {
    if (report.status === "COMPLETED") {
        return report.finishedAt ?? report.createdAt;
    }
    return report.createdAt;
}

function calculateTotalRealisasi(items: unknown): number {
    const reportItems = (items ?? []) as unknown as ReportItemJson[];
    let totalRealisasi = 0;

    for (const item of reportItems) {
        if (item.realisasiItems && item.realisasiItems.length > 0) {
            for (const real of item.realisasiItems) {
                totalRealisasi += (real.quantity || 0) * (real.price || 0);
            }
        }
    }

    return totalRealisasi;
}

async function getReportsInRangeByPjumDate(params: {
    bmsNIK: string;
    branchNames: string[];
    fromDate: Date;
    toDate: Date;
}): Promise<PjumReportCandidate[]> {
    const { bmsNIK, branchNames, fromDate, toDate } = params;

    const reports = await prisma.report.findMany({
        where: {
            createdByNIK: bmsNIK,
            branchName: { in: branchNames },
            status: { in: [...SEARCHABLE_PJUM_STATUSES] },
            OR: [
                {
                    status: "COMPLETED",
                    finishedAt: { not: null, gte: fromDate, lte: toDate },
                },
                {
                    status: "COMPLETED",
                    finishedAt: null,
                    createdAt: { gte: fromDate, lte: toDate },
                },
                {
                    status: { in: [...NON_COMPLETED_PJUM_STATUSES] },
                    createdAt: { gte: fromDate, lte: toDate },
                },
            ],
        },
        select: {
            reportNumber: true,
            createdAt: true,
            finishedAt: true,
            storeName: true,
            storeCode: true,
            branchName: true,
            status: true,
            items: true,
            pjumExportedAt: true,
        },
    });

    return reports.sort((a, b) => {
        const left = getPjumFilterDate(a as PjumReportCandidate);
        const right = getPjumFilterDate(b as PjumReportCandidate);
        return left.getTime() - right.getTime();
    }) as PjumReportCandidate[];
}

/**
 * Get all BMS users in the given branches (called server-side from page.tsx).
 */
export async function getPjumBmsUsers(
    branchNames: string[],
): Promise<PjumBmsUser[]> {
    const users = await prisma.user.findMany({
        where: {
            role: "BMS",
            branchNames: { hasSome: branchNames },
        },
        select: { NIK: true, name: true },
        orderBy: { name: "asc" },
    });
    return users;
}

/**
 * Get PJUM creation history for the current BMC user.
 */
export async function getBmcPjumHistory(
    limit = 100,
): Promise<PjumHistoryRow[]> {
    try {
        const user = await requireRole("BMC");

        const exports = await prisma.pjumExport.findMany({
            where: {
                branchName: { in: user.branchNames },
                createdByNIK: user.NIK,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        if (exports.length === 0) return [];

        const nikSet = new Set<string>();
        for (const row of exports) {
            nikSet.add(row.bmsNIK);
            if (row.approvedByNIK) nikSet.add(row.approvedByNIK);
        }

        const users = await prisma.user.findMany({
            where: { NIK: { in: Array.from(nikSet) } },
            select: { NIK: true, name: true },
        });
        const userMap = new Map(users.map((u) => [u.NIK, u.name]));

        const allReportNumbers = Array.from(
            new Set(exports.flatMap((row) => row.reportNumbers)),
        );
        const reports = await prisma.report.findMany({
            where: { reportNumber: { in: allReportNumbers } },
            select: { reportNumber: true, items: true },
        });
        const reportTotalMap = new Map(
            reports.map((report) => [
                report.reportNumber,
                calculateTotalRealisasi(report.items),
            ]),
        );

        return exports.map((row) => ({
            id: row.id,
            status: row.status,
            bmsNIK: row.bmsNIK,
            bmsName: userMap.get(row.bmsNIK) ?? row.bmsNIK,
            branchName: row.branchName,
            weekNumber: row.weekNumber,
            fromDate: row.fromDate.toISOString(),
            toDate: row.toDate.toISOString(),
            reportNumbers: row.reportNumbers,
            reportCount: row.reportNumbers.length,
            totalRealisasi: row.reportNumbers.reduce(
                (sum, reportNumber) =>
                    sum + (reportTotalMap.get(reportNumber) ?? 0),
                0,
            ),
            createdAt: row.createdAt.toISOString(),
            approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
            approvedByName: row.approvedByNIK
                ? (userMap.get(row.approvedByNIK) ?? row.approvedByNIK)
                : null,
            rejectionNotes: row.rejectionNotes,
            pjumFinalDriveUrl: row.pjumFinalDriveUrl,
        }));
    } catch (error) {
        logger.error({ operation: "getBmcPjumHistory" }, "Failed", error);
        return [];
    }
}

/**
 * Get all PJUM ranges that have ever been used by a BMS.
 * Used by UI to disable overlapping date selections.
 */
export async function getPjumBlockedRanges(
    bmsNIK: string,
): Promise<{ data: PjumBlockedRange[] | null; error: string | null }> {
    try {
        const user = await requireRole("BMC");
        await validateCSRF(await headers());

        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK },
            select: { branchNames: true, role: true },
        });

        if (!bmsUser || bmsUser.role !== "BMS") {
            return { data: null, error: "BMS tidak ditemukan" };
        }

        const hasAccess = bmsUser.branchNames.some((branch) =>
            user.branchNames.includes(branch),
        );
        if (!hasAccess) {
            return { data: null, error: "BMS tidak dalam cabang Anda" };
        }

        const ranges = await prisma.pjumExport.findMany({
            where: {
                bmsNIK,
                branchName: { in: user.branchNames },
            },
            select: {
                id: true,
                fromDate: true,
                toDate: true,
                status: true,
            },
            orderBy: { fromDate: "asc" },
        });

        return {
            data: ranges.map((range) => ({
                id: range.id,
                fromDate: range.fromDate.toISOString(),
                toDate: range.toDate.toISOString(),
                status: range.status,
            })),
            error: null,
        };
    } catch (error) {
        logger.error(
            { operation: "getPjumBlockedRanges", bmsNIK },
            "Failed",
            error,
        );
        return {
            data: null,
            error: "Terjadi kesalahan saat memuat rentang PJUM yang sudah digunakan",
        };
    }
}

/**
 * Search reports for a BMS user within a date range.
 * Called from client component — requires CSRF.
 */
export async function searchPjumReports(
    bmsNIK: string,
    from: string,
    to: string,
): Promise<{ data: PjumReportRow[] | null; error: string | null }> {
    try {
        const user = await requireRole("BMC");
        await validateCSRF(await headers());

        // Verify the BMS belongs to one of BMC's branches
        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK },
            select: { branchNames: true, role: true },
        });
        if (!bmsUser || bmsUser.role !== "BMS") {
            return { data: null, error: "BMS tidak ditemukan" };
        }
        const hasAccess = bmsUser.branchNames.some((b) =>
            user.branchNames.includes(b),
        );
        if (!hasAccess) {
            return { data: null, error: "BMS tidak dalam cabang Anda" };
        }

        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // include full last day

        if (fromDate > toDate) {
            return { data: null, error: "Tanggal mulai tidak valid" };
        }

        // Date filter rule:
        // - COMPLETED uses finishedAt
        // - selain COMPLETED uses createdAt
        const reports = await getReportsInRangeByPjumDate({
            bmsNIK,
            branchNames: user.branchNames,
            fromDate,
            toDate,
        });

        const data: PjumReportRow[] = reports.map((r) => {
            const items = (r.items ?? []) as unknown as ReportItemJson[];
            let totalRealisasi = 0;
            for (const item of items) {
                if (item.realisasiItems && item.realisasiItems.length > 0) {
                    for (const real of item.realisasiItems) {
                        totalRealisasi +=
                            (real.quantity || 0) * (real.price || 0);
                    }
                }
            }

            const dateForFilter = getPjumFilterDate(r);

            return {
                reportNumber: r.reportNumber,
                finishedAt: dateForFilter.toISOString(),
                storeName: r.storeName,
                storeCode: r.storeCode,
                branchName: r.branchName,
                status: r.status as string,
                totalRealisasi,
                pjumExportedAt: r.pjumExportedAt
                    ? r.pjumExportedAt.toISOString()
                    : null,
            };
        });

        return { data, error: null };
    } catch (error) {
        logger.error({ operation: "searchPjumReports" }, "Failed", error);
        return { data: null, error: "Terjadi kesalahan saat mencari laporan" };
    }
}

/**
 * Mark the selected completed reports as PJUM-exported
 * and create a PjumExport record pending BnM Manager approval.
 * GDrive upload + email happen after BnM Manager approves.
 */
export async function exportPjum(input: {
    reportNumbers: string[];
    bmsNIK: string;
    from: string;
    to: string;
    weekNumber: number;
}): Promise<{ error: string | null; pjumExportId: string | null; pjumFinalDriveUrl?: string | null }> {
    try {
        const user = await requireRole("BMC");
        await validateCSRF(await headers());

        const {
            reportNumbers: safeNumbers,
            bmsNIK,
            from,
            to,
            weekNumber,
        } = exportSchema.parse(input);

        const rangeFromDate = new Date(from);
        rangeFromDate.setHours(0, 0, 0, 0);
        const rangeToDate = new Date(to);
        rangeToDate.setHours(0, 0, 0, 0);
        const rangeToEndOfDay = new Date(rangeToDate);
        rangeToEndOfDay.setHours(23, 59, 59, 999);

        if (
            Number.isNaN(rangeFromDate.getTime()) ||
            Number.isNaN(rangeToDate.getTime())
        ) {
            return {
                error: "Format tanggal tidak valid",
                pjumExportId: null,
            };
        }

        if (rangeFromDate > rangeToDate) {
            return {
                error: "Rentang tanggal tidak valid",
                pjumExportId: null,
            };
        }

        // Block all overlapping ranges that have ever been used for this BMS.
        const overlappingExport = await prisma.pjumExport.findFirst({
            where: {
                bmsNIK,
                branchName: { in: user.branchNames },
                fromDate: { lte: rangeToEndOfDay },
                toDate: { gte: rangeFromDate },
            },
            orderBy: { fromDate: "asc" },
        });

        if (overlappingExport) {
            return {
                error: `Rentang tanggal ${from} sampai ${to} overlap dengan PJUM yang sudah ada (${overlappingExport.fromDate.toLocaleDateString("id-ID")} - ${overlappingExport.toDate.toLocaleDateString("id-ID")})`,
                pjumExportId: null,
            };
        }

        // Use same dataset/logic as search.
        const rangeReports = await getReportsInRangeByPjumDate({
            bmsNIK,
            branchNames: user.branchNames,
            fromDate: rangeFromDate,
            toDate: rangeToEndOfDay,
        });

        if (rangeReports.length === 0) {
            return {
                error: "Tidak ada laporan dalam rentang tanggal yang dipilih",
                pjumExportId: null,
            };
        }

        const nonCompletedReport = rangeReports.find(
            (report) => report.status !== "COMPLETED",
        );
        if (nonCompletedReport) {
            return {
                error: `Masih ada laporan dengan status ${nonCompletedReport.status}. PJUM hanya bisa dibuat jika semua laporan dalam rentang tanggal sudah SELESAI`,
                pjumExportId: null,
            };
        }

        const eligibleReportNumbers = rangeReports
            .filter((report) => !report.pjumExportedAt)
            .map((report) => report.reportNumber);
        const eligibleSet = new Set(eligibleReportNumbers);

        if (
            safeNumbers.length !== eligibleReportNumbers.length ||
            safeNumbers.some((reportNumber) => !eligibleSet.has(reportNumber))
        ) {
            return {
                error: "Data laporan berubah. Klik Cari Laporan lagi sebelum membuat PJUM",
                pjumExportId: null,
            };
        }

        const branchName = rangeReports[0].branchName;

        // Create PjumExport record in PENDING_APPROVAL status
        const pjumExport = await prisma.pjumExport.create({
            data: {
                status: "PENDING_APPROVAL",
                bmsNIK,
                branchName,
                weekNumber,
                fromDate: rangeFromDate,
                toDate: rangeToDate,
                reportNumbers: safeNumbers,
                createdByNIK: user.NIK,
            },
        });

        // Mark reports as included in PJUM
        await prisma.report.updateMany({
            where: {
                reportNumber: { in: safeNumbers },
                status: "COMPLETED",
                pjumExportedAt: null,
            },
            data: { pjumExportedAt: new Date() },
        });

        // Generate and upload PDF snapshot to Drive
        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK },
            select: { name: true },
        });
        const bmsName = bmsUser?.name ?? bmsNIK;

        const result = await generatePjumPackagePdf({
            reportNumbers: safeNumbers,
            bmsNIK,
            from: rangeFromDate.toISOString(),
            to: rangeToDate.toISOString(),
            weekNumber,
            requireExported: true,
            requester: {
                NIK: user.NIK,
                name: user.name,
                branchNames: user.branchNames,
            },
        });

        // Generate PDF snapshot and save to pdf-snapshots/pjum/ (not the final PJUM folder,
        // since this is still pending approval by BnM Manager).
        const snapshotPath = buildPjumSnapshotPath({
            branchName,
            bmsNIK,
            weekNumber,
            from: rangeFromDate.toISOString(),
            to: rangeToDate.toISOString(),
            version: pjumExport.id,
        });

        const snapshotDriveUrl = await uploadPdfSnapshot(
            snapshotPath,
            result.buffer,
        );

        await prisma.pjumExport.update({
            where: { id: pjumExport.id },
            data: {
                pjumPdfPath: snapshotPath,
                pjumFinalDriveUrl: snapshotDriveUrl,
            },
        });

        logger.info(
            {
                operation: "exportPjum",
                pjumExportId: pjumExport.id,
                reportCount: safeNumbers.length,
                bmsNIK,
                branchName,
            },
            "PJUM created, pending BnM Manager approval",
        );

        revalidatePath("/reports/pjum");
        return { error: null, pjumExportId: pjumExport.id, pjumFinalDriveUrl: snapshotDriveUrl };
    } catch (error) {
        logger.error(
            { operation: "exportPjum" },
            "Failed to create PJUM",
            error,
        );
        return {
            error: "Terjadi kesalahan saat membuat PJUM",
            pjumExportId: null,
            pjumFinalDriveUrl: null,
        };
    }
}
