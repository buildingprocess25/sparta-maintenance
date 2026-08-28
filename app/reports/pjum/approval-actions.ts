"use server";

import prisma from "@/lib/prisma";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import {
    uploadCompletedReportToDrive,
    uploadPjumToDrive,
} from "@/lib/google-drive/archive";
import { sendPjumNotification } from "@/lib/email/send-pjum-notification";
import type { PjumFormData } from "@/lib/pdf/generate-pjum-form-pdf";
import { calculateTotalRealisasiFromItems } from "@/lib/realisasi";
import {
    JAKARTA_TIME_ZONE,
    getJakartaDayRange,
    getJakartaMonth,
    getJakartaMonthWindow,
    getJakartaWeekStartKey,
    getJakartaYear,
    getTodayJakartaRange,
} from "@/lib/time";
import {
    deletePdfSnapshots,
    downloadPdfSnapshot,
} from "@/lib/pdf/snapshot-storage";
import { buildReportPdfBuffer } from "@/lib/pdf/report-pdf-builder";
import {
    approvePjumAndTransitionBmsBalance,
    getOmittedHangingReportsForPjum,
} from "@/lib/balance";

function isGoogleDriveUrl(value: string | null | undefined): value is string {
    return (
        typeof value === "string" &&
        value.startsWith("https://drive.google.com/")
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PjumExportListItem = {
    id: string;
    status: string;
    bmsNIK: string;
    bmsName: string;
    branchName: string;
    weekNumber: number;
    fromDate: string;
    toDate: string;
    reportCount: number;
    createdAt: string;
};

export type PjumExportDetail = {
    id: string;
    status: string;
    bmsNIK: string;
    bmsName: string;
    branchName: string;
    weekNumber: number;
    fromDate: string;
    toDate: string;
    reportNumbers: string[];
    createdByNIK: string;
    createdByName: string;
    createdAt: string;
    reports: {
        reportNumber: string;
        storeName: string;
        storeCode: string | null;
        finishedAt: string | null;
        totalRealisasi: number;
    }[];
    totalExpenditure: number;
    omittedHangingReports: {
        reportNumber: string;
        realizedAmount: number;
    }[];
    pjumFinalDriveUrl: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List PJUM exports pending approval for the BnM Manager's branches.
 */
export async function getPendingPjumExports(filters?: {
    search?: string;
    dateRange?: string;
    page?: number;
    limit?: number;
}): Promise<{
    data: PjumExportListItem[] | null;
    total: number;
    page: number;
    limit: number;
    error: string | null;
}> {
    try {
        const user = await requireRole("BNM_MANAGER");

        const page = Math.max(1, filters?.page ?? 1);
        const limit = Math.max(1, filters?.limit ?? 10);
        const skip = (page - 1) * limit;

        let dateFrom: Date | undefined;
        if (filters?.dateRange && filters.dateRange !== "all") {
            const now = new Date();

            if (filters.dateRange === "today") {
                dateFrom = getTodayJakartaRange(now).start;
            } else if (filters.dateRange === "week") {
                dateFrom = getJakartaDayRange(getJakartaWeekStartKey(now))
                    .start;
            } else if (filters.dateRange === "month") {
                dateFrom = getJakartaMonthWindow(
                    getJakartaYear(now),
                    getJakartaMonth(now),
                ).start;
            }
        }

        const q = filters?.search?.trim();
        let nikFromName: string[] = [];
        if (q) {
            const matchedUsers = await prisma.user.findMany({
                where: {
                    role: "BMS",
                    name: { contains: q, mode: "insensitive" },
                },
                select: { NIK: true },
            });
            nikFromName = matchedUsers.map((u) => u.NIK);
        }

        const where: {
            branchName: { in: string[] };
            status: "PENDING_APPROVAL";
            createdAt?: { gte: Date };
            OR?: Array<
                | { bmsNIK: { contains: string; mode: "insensitive" } }
                | { branchName: { contains: string; mode: "insensitive" } }
                | { bmsNIK: { in: string[] } }
            >;
        } = {
            branchName: { in: user.branchNames },
            status: "PENDING_APPROVAL",
        };

        if (dateFrom) {
            where.createdAt = { gte: dateFrom };
        }

        if (q) {
            where.OR = [
                { bmsNIK: { contains: q, mode: "insensitive" } },
                { branchName: { contains: q, mode: "insensitive" } },
            ];

            if (nikFromName.length > 0) {
                where.OR.push({ bmsNIK: { in: nikFromName } });
            }
        }

        const [exports, total] = await Promise.all([
            prisma.pjumExport.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.pjumExport.count({ where }),
        ]);

        // Batch-fetch BMS names
        const bmsNIKs = [...new Set(exports.map((e) => e.bmsNIK))];
        const bmsUsers = await prisma.user.findMany({
            where: { NIK: { in: bmsNIKs } },
            select: { NIK: true, name: true },
        });
        const bmsMap = new Map(bmsUsers.map((u) => [u.NIK, u.name]));

        const data: PjumExportListItem[] = exports.map((e) => ({
            id: e.id,
            status: e.status,
            bmsNIK: e.bmsNIK,
            bmsName: bmsMap.get(e.bmsNIK) ?? e.bmsNIK,
            branchName: e.branchName,
            weekNumber: e.weekNumber,
            fromDate: e.fromDate.toISOString(),
            toDate: e.toDate.toISOString(),
            reportCount: e.reportNumbers.length,
            createdAt: e.createdAt.toISOString(),
        }));

        return { data, total, page, limit, error: null };
    } catch (error) {
        logger.error({ operation: "getPendingPjumExports" }, "Failed", error);
        return {
            data: null,
            total: 0,
            page: 1,
            limit: 10,
            error: "Gagal memuat daftar PJUM",
        };
    }
}

/**
 * Get details of a single PJUM export for BnM Manager review.
 */
export async function getPjumExportDetail(
    id: string,
): Promise<{ data: PjumExportDetail | null; error: string | null }> {
    try {
        const user = await requireRole("BNM_MANAGER");

        const pjumExport = await prisma.pjumExport.findUnique({
            where: { id },
        });

        if (!pjumExport) {
            return { data: null, error: "PJUM tidak ditemukan" };
        }
        if (!user.branchNames.includes(pjumExport.branchName)) {
            return { data: null, error: "PJUM tidak dalam cabang Anda" };
        }

        // Fetch BMS info
        const bmsUser = await prisma.user.findUnique({
            where: { NIK: pjumExport.bmsNIK },
            select: { name: true, NIK: true },
        });

        // Fetch BMC info
        const bmcUser = await prisma.user.findUnique({
            where: { NIK: pjumExport.createdByNIK },
            select: { name: true },
        });

        // Fetch reports
        const reports = await prisma.report.findMany({
            where: {
                reportNumber: { in: pjumExport.reportNumbers },
            },
            select: {
                reportNumber: true,
                storeName: true,
                storeCode: true,
                finishedAt: true,
                items: true,
            },
            orderBy: { finishedAt: "asc" },
        });

        const reportSummaries = reports.map((r) => {
            const totalRealisasi = calculateTotalRealisasiFromItems(r.items);
            return {
                reportNumber: r.reportNumber,
                storeName: r.storeName,
                storeCode: r.storeCode,
                finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
                totalRealisasi,
            };
        });

        const totalExpenditure = reportSummaries.reduce(
            (sum, r) => sum + r.totalRealisasi,
            0,
        );
        const omittedHangingReports =
            pjumExport.status === "PENDING_APPROVAL"
                ? await getOmittedHangingReportsForPjum({
                      pjumExportId: pjumExport.id,
                      approvedReportNumbers: pjumExport.reportNumbers,
                  })
                : [];

        const data: PjumExportDetail = {
            id: pjumExport.id,
            status: pjumExport.status,
            bmsNIK: pjumExport.bmsNIK,
            bmsName: bmsUser?.name ?? pjumExport.bmsNIK,
            branchName: pjumExport.branchName,
            weekNumber: pjumExport.weekNumber,
            fromDate: pjumExport.fromDate.toISOString(),
            toDate: pjumExport.toDate.toISOString(),
            reportNumbers: pjumExport.reportNumbers,
            createdByNIK: pjumExport.createdByNIK,
            createdByName: bmcUser?.name ?? pjumExport.createdByNIK,
            createdAt: pjumExport.createdAt.toISOString(),
            reports: reportSummaries.map((r) => ({
                reportNumber: r.reportNumber,
                storeName: r.storeName,
                storeCode: r.storeCode,
                finishedAt: r.finishedAt,
                totalRealisasi: r.totalRealisasi,
            })),
            totalExpenditure,
            omittedHangingReports: omittedHangingReports.map((report) => ({
                reportNumber: report.reportNumber,
                realizedAmount: report.realizedAmount,
            })),
            pjumFinalDriveUrl: pjumExport.pjumFinalDriveUrl,
        };

        return { data, error: null };
    } catch (error) {
        logger.error({ operation: "getPjumExportDetail", id }, "Failed", error);
        return { data: null, error: "Gagal memuat detail PJUM" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

const approveSchema = z.object({
    pjumExportId: z.string().uuid(),
    confirmHangingExpiry: z.boolean().default(false),
});

/**
 * Approve a PJUM export: generate final PDF package, upload to GDrive,
 * and send email to Branch Admin.
 */
export async function approvePjumExport(input: {
    pjumExportId: string;
    confirmHangingExpiry?: boolean;
}): Promise<{ error: string | null }> {
    const startTime = Date.now();
    try {
        const user = await requireRole("BNM_MANAGER");
        await validateCSRF(await headers());

        const validated = approveSchema.parse(input);

        const pjumExport = await prisma.pjumExport.findUnique({
            where: { id: validated.pjumExportId },
            select: {
                id: true,
                bmsNIK: true,
                branchName: true,
                weekNumber: true,
                monthName: true,
                fromDate: true,
                toDate: true,
                reportNumbers: true,
                createdByNIK: true,
                status: true,
                pjumPdfPath: true,
            },
        });

        if (!pjumExport) {
            return { error: "PJUM tidak ditemukan" };
        }
        if (!user.branchNames.includes(pjumExport.branchName)) {
            return { error: "PJUM tidak dalam cabang Anda" };
        }
        if (pjumExport.status !== "PENDING_APPROVAL") {
            return { error: "PJUM sudah diproses sebelumnya" };
        }

        const omittedHangingReports = await getOmittedHangingReportsForPjum({
            pjumExportId: pjumExport.id,
            approvedReportNumbers: pjumExport.reportNumbers,
        });
        if (
            omittedHangingReports.length > 0 &&
            !validated.confirmHangingExpiry
        ) {
            return {
                error: `${omittedHangingReports.length} laporan menggantung akan kedaluwarsa permanen. Konfirmasi konsekuensi ini sebelum menyetujui PJUM.`,
            };
        }

        // Fetch BMS + BMC info
        const [bmsUser, bmcUser] = await Promise.all([
            prisma.user.findUnique({
                where: { NIK: pjumExport.bmsNIK },
                select: { name: true, NIK: true },
            }),
            prisma.user.findUnique({
                where: { NIK: pjumExport.createdByNIK },
                select: { name: true, NIK: true },
            }),
        ]);

        const bmsName = bmsUser?.name ?? pjumExport.bmsNIK;
        const approvedAtDate = new Date();

        // Keep PJUM form page in final package.
        const reports = await prisma.report.findMany({
            where: { reportNumber: { in: pjumExport.reportNumbers } },
            select: {
                reportNumber: true,
                items: true,
                branchName: true,
                storeCode: true,
                storeName: true,
                createdByNIK: true,
                createdBy: { select: { name: true } },
                completedPdfPath: true,
            },
        });

        const totalExpenditure = reports.reduce(
            (sum, report) => sum + calculateTotalRealisasiFromItems(report.items),
            0,
        );

        const pjumFormData: PjumFormData = {
            weekNumber: pjumExport.weekNumber,
            // Prioritaskan bulan yang dipilih BMC. Fallback ke fromDate
            // untuk PJUM lama (sebelum fitur ini).
            monthName:
                pjumExport.monthName ??
                pjumExport.fromDate.toLocaleString("id-ID", {
                    month: "long",
                    timeZone: JAKARTA_TIME_ZONE,
                }),
            year: getJakartaYear(pjumExport.fromDate),
            bmsName,
            submissionDate: approvedAtDate.toISOString(),
            totalExpenditure,
            periodeFrom: pjumExport.fromDate.toISOString(),
            periodeTo: pjumExport.toDate.toISOString(),
        };

        // Generate final PDF package.
        const result = await generatePjumPackagePdf({
            reportNumbers: pjumExport.reportNumbers,
            bmsNIK: pjumExport.bmsNIK,
            from: pjumExport.fromDate.toISOString(),
            to: pjumExport.toDate.toISOString(),
            weekNumber: pjumExport.weekNumber,
            requireExported: true,
            requester: {
                NIK: bmcUser?.NIK ?? pjumExport.createdByNIK,
                name: bmcUser?.name ?? pjumExport.createdByNIK,
                branchNames: [pjumExport.branchName],
            },
            pjumData: pjumFormData,
            approver: {
                NIK: user.NIK,
                name: user.name,
            },
            approvedAt: approvedAtDate.toISOString(),
        });

        // Upload final PJUM to GDrive
        const uploadedPjum = await uploadPjumToDrive({
            branchName: result.branchName,
            bmsNIK: pjumExport.bmsNIK,
            bmsName,
            year: result.year,
            monthName: result.monthName,
            weekNumber: pjumExport.weekNumber,
            reportCount: pjumExport.reportNumbers.length,
            documentCode: pjumExport.id.slice(0, 8),
            pdfBuffer: result.buffer,
        });

        // Keep one final PDF per report in canonical Drive location.
        // If COMPLETED snapshot already points to Drive, reuse it directly.
        // Fallback upload is only for legacy rows that still store old snapshot paths.
        for (const report of reports) {
            let finalDriveUrl = isGoogleDriveUrl(report.completedPdfPath)
                ? report.completedPdfPath
                : null;

            if (!finalDriveUrl) {
                let reportPdfBuffer: Buffer | null = null;

                if (
                    report.completedPdfPath &&
                    !isGoogleDriveUrl(report.completedPdfPath)
                ) {
                    reportPdfBuffer = await downloadPdfSnapshot(
                        report.completedPdfPath,
                    );
                }

                if (!reportPdfBuffer) {
                    const rebuilt = await buildReportPdfBuffer(
                        report.reportNumber,
                    );
                    reportPdfBuffer = rebuilt.buffer;
                }

                const finalUploaded = await uploadCompletedReportToDrive({
                    branchName: report.branchName,
                    bmsNIK: report.createdByNIK,
                    bmsName: report.createdBy.name,
                    storeCode: report.storeCode,
                    storeName: report.storeName,
                    reportNumber: report.reportNumber,
                    pdfBuffer: reportPdfBuffer,
                });

                finalDriveUrl =
                    finalUploaded.webViewLink ??
                    `https://drive.google.com/file/d/${finalUploaded.fileId}/view`;
            }

            await prisma.report.update({
                where: { reportNumber: report.reportNumber },
                data: {
                    reportFinalDriveUrl: finalDriveUrl,
                },
            });
        }

        // Approve PJUM and transition BMS balance atomically.
        await approvePjumAndTransitionBmsBalance(pjumExport.bmsNIK, {
            id: pjumExport.id,
            reportNumbers: pjumExport.reportNumbers,
            fromDate: pjumExport.fromDate,
            toDate: pjumExport.toDate,
            approvedByNIK: user.NIK,
            approvedAt: approvedAtDate,
            pjumFinalDriveUrl:
                uploadedPjum.webViewLink ?? uploadedPjum.folderUrl,
        });

        dispatchNotificationEvent({
            type: "PJUM_APPROVED",
            actorNIK: user.NIK,
            pjumExportId: pjumExport.id,
        });

        const snapshotPathsToDelete = [
            pjumExport.pjumPdfPath,
            ...reports.flatMap((report) => [
                isGoogleDriveUrl(report.completedPdfPath)
                    ? null
                    : report.completedPdfPath,
            ]),
        ].filter((value): value is string => Boolean(value));

        await deletePdfSnapshots(snapshotPathsToDelete);

        await prisma.report.updateMany({
            where: { reportNumber: { in: pjumExport.reportNumbers } },
            data: {
                completedPdfPath: null,
            },
        });

        await prisma.pjumExport.update({
            where: { id: pjumExport.id },
            data: {
                pjumPdfPath: null,
            },
        });

        // Send email to Branch Admin (fire-and-forget)
        sendPjumNotification({
            branchName: pjumExport.branchName,
            pdfBuffer: result.buffer,
            bmsName,
            weekNumber: pjumExport.weekNumber,
            monthName: result.monthName,
            year: result.year,
        }).catch((err) => {
            logger.error(
                { operation: "approvePjumExport.sendEmail" },
                "Email failed",
                err,
            );
        });

        logger.info(
            {
                operation: "approvePjumExport",
                pjumExportId: pjumExport.id,
                approvedBy: user.NIK,
                duration: Date.now() - startTime,
            },
            "PJUM approved successfully",
        );

        revalidatePath("/reports/pjum");
        revalidatePath(`/reports/pjum/${pjumExport.id}`);
        revalidatePath("/dashboard/pjum");
        revalidatePath(`/dashboard/pjum/${pjumExport.id}`);
        revalidatePath("/dashboard/reports");
        revalidatePath("/dashboard");
        return { error: null };
    } catch (error) {
        logger.error(
            {
                operation: "approvePjumExport",
                duration: Date.now() - startTime,
            },
            "Failed to approve PJUM",
            error,
        );
        return { error: "Terjadi kesalahan saat menyetujui PJUM" };
    }
}

/**
 * Reject flow is temporarily disabled per business request.
 */
export async function rejectPjumExport(input: {
    pjumExportId: string;
    notes: string;
}): Promise<{ error: string | null }> {
    logger.warn(
        { operation: "rejectPjumExport", pjumExportId: input.pjumExportId },
        "Reject PJUM is disabled",
    );
    return { error: "Fitur penolakan PJUM sementara dinonaktifkan" };
}
