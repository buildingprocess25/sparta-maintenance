"use server";

"use server";

import prisma from "@/lib/prisma";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { requiresPjum, resolveReportTotalRealisasi } from "@/lib/realisasi";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import { getJakartaDateRange } from "@/lib/time";
import { isActivePjumHangingReport } from "@/lib/pjum-hanging";
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "@/lib/pjum-selection-policy";
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
    requiresPjum: boolean;
    isHangingReport: boolean;
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
    monthName: string;
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
    monthName: z.string().min(1, "Bulan wajib diisi"),
});

class PjumExportConflictError extends Error {
    constructor(message = "Beberapa laporan sudah masuk PJUM lain") {
        super(message);
        this.name = "PjumExportConflictError";
    }
}

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
    totalReal: unknown;
    items: unknown;
    pjumExportedAt: Date | null;
    pjumHangingAt: Date | null;
    pjumExpiredAt: Date | null;
};

function getPjumFilterDate(report: PjumReportCandidate): Date {
    if (report.status === "COMPLETED") {
        return report.finishedAt ?? report.createdAt;
    }
    return report.createdAt;
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
            pjumExpiredAt: null,
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
                {
                    status: "COMPLETED",
                    pjumExportedAt: null,
                    pjumHangingAt: { not: null },
                    balancePeriod: {
                        bmsNIK,
                        status: { in: ["ACTIVE", "LOCKED_PJUM"] },
                    },
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
            totalReal: true,
            items: true,
            pjumExportedAt: true,
            pjumHangingAt: true,
            pjumExpiredAt: true,
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
            deletedAt: null,
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
            select: { reportNumber: true, totalReal: true, items: true },
        });
        const reportTotalMap = new Map(
            reports.map((report) => [
                report.reportNumber,
                resolveReportTotalRealisasi(report.totalReal, report.items),
            ]),
        );

        return exports.map((row) => ({
            id: row.id,
            status: row.status,
            bmsNIK: row.bmsNIK,
            bmsName: userMap.get(row.bmsNIK) ?? row.bmsNIK,
            branchName: row.branchName,
            weekNumber: row.weekNumber,
            monthName: row.monthName ?? row.fromDate.toLocaleString("id-ID", {
                month: "long",
                timeZone: "Asia/Jakarta",
            }),
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
 * Used by UI to warn about overlapping date selections.
 */
export async function getPjumBlockedRanges(
    bmsNIK: string,
): Promise<{ data: PjumBlockedRange[] | null; error: string | null }> {
    try {
        const user = await requireRole("BMC");
        await validateCSRF(await headers());

        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK },
            select: { branchNames: true, role: true, deletedAt: true },
        });

        if (!bmsUser || bmsUser.deletedAt || bmsUser.role !== "BMS") {
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
            select: { branchNames: true, role: true, deletedAt: true },
        });
        if (!bmsUser || bmsUser.deletedAt || bmsUser.role !== "BMS") {
            return { data: null, error: "BMS tidak ditemukan" };
        }
        const hasAccess = bmsUser.branchNames.some((b) =>
            user.branchNames.includes(b),
        );
        if (!hasAccess) {
            return { data: null, error: "BMS tidak dalam cabang Anda" };
        }

        const { start, endExclusive } = getJakartaDateRange(from, to);

        if (!start || !endExclusive) {
            return { data: null, error: "Tanggal mulai tidak valid" };
        }

        if (start >= endExclusive) {
            return { data: null, error: "Tanggal mulai tidak valid" };
        }

        // Date filter rule:
        // - COMPLETED uses finishedAt
        // - selain COMPLETED uses createdAt
        const reports = await getReportsInRangeByPjumDate({
            bmsNIK,
            branchNames: user.branchNames,
            fromDate: start,
            toDate: new Date(endExclusive.getTime() - 1),
        });

        const data: PjumReportRow[] = reports.map((r) => {
            const dateForFilter = getPjumFilterDate(r);

            return {
                reportNumber: r.reportNumber,
                finishedAt: dateForFilter.toISOString(),
                storeName: r.storeName,
                storeCode: r.storeCode,
                branchName: r.branchName,
                status: r.status as string,
                totalRealisasi: resolveReportTotalRealisasi(
                    r.totalReal,
                    r.items,
                ),
                pjumExportedAt: r.pjumExportedAt
                    ? r.pjumExportedAt.toISOString()
                    : null,
                requiresPjum: requiresPjum(r.totalReal, r.items),
                isHangingReport: isActivePjumHangingReport(r),
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
    monthName: string;
}): Promise<{
    error: string | null;
    pjumExportId: string | null;
    pjumFinalDriveUrl?: string | null;
}> {
    try {
        const user = await requireRole("BMC");
        await validateCSRF(await headers());

        const parsed = exportSchema.parse(input);
        const safeNumbers = Array.from(new Set(parsed.reportNumbers));
        const { bmsNIK, from, to, weekNumber, monthName } = parsed;

        if (safeNumbers.length !== parsed.reportNumbers.length) {
            return {
                error: "Nomor laporan duplikat dalam daftar PJUM",
                pjumExportId: null,
            };
        }

        const { start: rangeFromDate, endExclusive: rangeToEndOfDay } = getJakartaDateRange(from, to);

        if (
            !rangeFromDate || !rangeToEndOfDay
        ) {
            return {
                error: "Format tanggal tidak valid",
                pjumExportId: null,
            };
        }

        if (rangeFromDate >= rangeToEndOfDay) {
            return {
                error: "Rentang tanggal tidak valid",
                pjumExportId: null,
            };
        }
        
        // for inclusive toDate
        const rangeToDate = new Date(rangeToEndOfDay.getTime() - 24 * 60 * 60 * 1000);

        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK },
            select: { branchNames: true, role: true, deletedAt: true },
        });
        const hasBmsAccess =
            bmsUser?.role === "BMS" &&
            !bmsUser.deletedAt &&
            bmsUser.branchNames.some((branchName) =>
                user.branchNames.includes(branchName),
            );

        if (!hasBmsAccess) {
            return {
                error: "BMS tidak ditemukan atau tidak dalam cabang Anda",
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
            .filter((report) => !report.pjumExportedAt && requiresPjum(report.totalReal, report.items))
            .map((report) => report.reportNumber);
        const eligibleSet = new Set(eligibleReportNumbers);

        const selectionPolicy = evaluatePjumSelectionPolicy({
            rows: rangeReports.map((report) => ({
                reportNumber: report.reportNumber,
                totalRealisasi: resolveReportTotalRealisasi(
                    report.totalReal,
                    report.items,
                ),
                isHangingReport: isActivePjumHangingReport(report),
                isValid:
                    report.status === "COMPLETED" &&
                    !report.pjumExportedAt &&
                    !report.pjumExpiredAt &&
                    requiresPjum(report.totalReal, report.items),
            })),
            selectedReportNumbers: safeNumbers,
        });

        if (selectionPolicy.missingMandatoryHangingReportNumbers.length > 0) {
            return {
                error: `Laporan gantung ${selectionPolicy.missingMandatoryHangingReportNumbers.join(", ")} wajib masuk PJUM periode ini`,
                pjumExportId: null,
                pjumFinalDriveUrl: null,
            };
        }

        if (selectionPolicy.exceedsLimit) {
            return {
                error: `Total nominal laporan yang akan di-PJUM-kan tidak boleh lebih dari Rp ${PJUM_SELECTION_LIMIT.toLocaleString("id-ID")}`,
                pjumExportId: null,
                pjumFinalDriveUrl: null,
            };
        }

        if (safeNumbers.some((reportNumber) => !eligibleSet.has(reportNumber))) {
            return {
                error: "Data laporan berubah. Klik Cari Laporan lagi sebelum membuat PJUM",
                pjumExportId: null,
            };
        }

        const activeExportWithSelectedReports = await prisma.pjumExport.findFirst(
            {
                where: {
                    status: { in: ["PENDING_APPROVAL", "APPROVED"] },
                    reportNumbers: { hasSome: safeNumbers },
                },
                select: {
                    id: true,
                    reportNumbers: true,
                },
            },
        );

        if (activeExportWithSelectedReports) {
            const duplicateNumbers =
                activeExportWithSelectedReports.reportNumbers.filter(
                    (reportNumber) => eligibleSet.has(reportNumber),
                );
            return {
                error:
                    duplicateNumbers.length > 0
                        ? `Laporan ${duplicateNumbers.join(", ")} sudah masuk PJUM lain`
                        : "Beberapa laporan sudah masuk PJUM lain",
                pjumExportId: null,
            };
        }

        const branchName = rangeReports[0].branchName;

        const pjumExport = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.report.updateMany({
                where: {
                    reportNumber: { in: safeNumbers },
                    status: "COMPLETED",
                    pjumExportedAt: null,
                    pjumExpiredAt: null,
                },
                data: { pjumExportedAt: new Date() },
            });

            if (updateResult.count !== safeNumbers.length) {
                throw new PjumExportConflictError(
                    "Data laporan berubah. Klik Cari Laporan lagi sebelum membuat PJUM",
                );
            }

            const createdPjum = await tx.pjumExport.create({
                data: {
                    status: "PENDING_APPROVAL",
                    bmsNIK,
                    branchName,
                    weekNumber,
                    monthName,
                    fromDate: rangeFromDate,
                    toDate: rangeToDate,
                    reportNumbers: safeNumbers,
                    createdByNIK: user.NIK,
                },
            });

            const lockResult = await tx.bmsBalancePeriod.updateMany({
                where: { bmsNIK, status: "ACTIVE" },
                data: {
                    status: "LOCKED_PJUM",
                    pjumExportId: createdPjum.id,
                },
            });
            if (lockResult.count !== 1) {
                throw new PjumExportConflictError(
                    "Periode saldo BMS tidak aktif atau sedang dikunci PJUM lain",
                );
            }

            return createdPjum;
        });

        // Generate and upload PDF snapshot to Drive
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
        return {
            error: null,
            pjumExportId: pjumExport.id,
            pjumFinalDriveUrl: snapshotDriveUrl,
        };
    } catch (error) {
        if (error instanceof PjumExportConflictError) {
            return {
                error: error.message,
                pjumExportId: null,
                pjumFinalDriveUrl: null,
            };
        }

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
