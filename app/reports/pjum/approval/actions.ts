"use server";

import prisma from "@/lib/prisma";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import { uploadPjumToDrive } from "@/lib/google-drive/archive";
import { sendPjumNotification } from "@/lib/email/send-pjum-notification";
import type { PjumFormData, PumFormData } from "@/lib/pdf/generate-pjum-form-pdf";

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
        totalEstimation: number;
    }[];
    totalExpenditure: number;
};

export type BankAccountOption = {
    id: string;
    bankAccountNo: string;
    bankAccountName: string;
    bankName: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List PJUM exports pending approval for the BnM Manager's branches.
 */
export async function getPendingPjumExports(): Promise<{
    data: PjumExportListItem[] | null;
    error: string | null;
}> {
    try {
        const user = await requireRole("BNM_MANAGER");

        const exports = await prisma.pjumExport.findMany({
            where: {
                branchName: { in: user.branchNames },
                status: "PENDING_APPROVAL",
            },
            orderBy: { createdAt: "desc" },
        });

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

        return { data, error: null };
    } catch (error) {
        logger.error(
            { operation: "getPendingPjumExports" },
            "Failed",
            error,
        );
        return { data: null, error: "Gagal memuat daftar PJUM" };
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
                totalEstimation: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const totalExpenditure = reports.reduce(
            (sum, r) => sum + Number(r.totalEstimation),
            0,
        );

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
            reports: reports.map((r) => ({
                reportNumber: r.reportNumber,
                storeName: r.storeName,
                storeCode: r.storeCode,
                totalEstimation: Number(r.totalEstimation),
            })),
            totalExpenditure,
        };

        return { data, error: null };
    } catch (error) {
        logger.error(
            { operation: "getPjumExportDetail", id },
            "Failed",
            error,
        );
        return { data: null, error: "Gagal memuat detail PJUM" };
    }
}

/**
 * Get saved bank accounts for a BMS (for auto-fill).
 */
export async function getBmsBankAccounts(
    bmsNIK: string,
): Promise<{ data: BankAccountOption[]; error: string | null }> {
    try {
        await requireRole("BNM_MANAGER");

        const accounts = await prisma.pjumBankAccount.findMany({
            where: { bmsNIK },
            select: {
                id: true,
                bankAccountNo: true,
                bankAccountName: true,
                bankName: true,
            },
            orderBy: { updatedAt: "desc" },
        });

        return { data: accounts, error: null };
    } catch (error) {
        logger.error(
            { operation: "getBmsBankAccounts", bmsNIK },
            "Failed",
            error,
        );
        return { data: [], error: "Gagal memuat data rekening" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

const approveSchema = z.object({
    pjumExportId: z.string().uuid(),
    bankAccountNo: z.string().min(1, "No. Rekening wajib diisi"),
    bankAccountName: z.string().min(1, "Atas Nama wajib diisi"),
    bankName: z.string().min(1, "Nama Bank wajib diisi"),
    pumWeekNumber: z
        .number()
        .int()
        .min(1, "Minggu ke minimal 1")
        .max(5, "Minggu ke maksimal 5"),
    pumMonth: z.string().min(1, "Bulan PUM wajib diisi"),
    pumYear: z.number().int().min(2024).max(2099),
});

/**
 * Approve a PJUM export: generate final PDF (with form), upload to GDrive,
 * send email to Branch Admin, and save bank account for auto-fill.
 */
export async function approvePjumExport(input: {
    pjumExportId: string;
    bankAccountNo: string;
    bankAccountName: string;
    bankName: string;
    pumWeekNumber: number;
    pumMonth: string;
    pumYear: number;
}): Promise<{ error: string | null }> {
    const startTime = Date.now();
    try {
        const user = await requireRole("BNM_MANAGER");
        await validateCSRF(await headers());

        const validated = approveSchema.parse(input);

        const pjumExport = await prisma.pjumExport.findUnique({
            where: { id: validated.pjumExportId },
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

        // Build form data for PDF
        const pjumFormData: PjumFormData = {
            weekNumber: pjumExport.weekNumber,
            monthName: pjumExport.fromDate.toLocaleString("id-ID", {
                month: "long",
            }),
            year: pjumExport.fromDate.getFullYear(),
            bmsName,
            submissionDate: new Date().toISOString(),
            totalExpenditure: 0, // will be filled from reports
        };

        const pumFormData: PumFormData = {
            bmsName,
            bmsNIK: pjumExport.bmsNIK,
            bankAccountNo: validated.bankAccountNo,
            bankAccountName: validated.bankAccountName,
            bankName: validated.bankName,
            pumWeekNumber: validated.pumWeekNumber,
            pumMonth: validated.pumMonth,
            pumYear: validated.pumYear,
            branchName: pjumExport.branchName,
        };

        // Calculate total expenditure from reports
        const reports = await prisma.report.findMany({
            where: { reportNumber: { in: pjumExport.reportNumbers } },
            select: { totalEstimation: true },
        });
        pjumFormData.totalExpenditure = reports.reduce(
            (sum, r) => sum + Number(r.totalEstimation),
            0,
        );

        // Generate final PDF with form pages
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
            pumData: {
                pjum: pjumFormData,
                pum: pumFormData,
            },
        });

        // Upload to GDrive
        await uploadPjumToDrive({
            branchName: result.branchName,
            year: result.year,
            monthName: result.monthName,
            weekNumber: pjumExport.weekNumber,
            pdfBuffer: result.buffer,
        });

        // Update PjumExport record
        await prisma.pjumExport.update({
            where: { id: pjumExport.id },
            data: {
                status: "APPROVED",
                approvedByNIK: user.NIK,
                approvedAt: new Date(),
                pumBankAccountNo: validated.bankAccountNo,
                pumBankAccountName: validated.bankAccountName,
                pumBankName: validated.bankName,
                pumWeekNumber: validated.pumWeekNumber,
                pumMonth: validated.pumMonth,
                pumYear: validated.pumYear,
            },
        });

        // Save bank account for future auto-fill
        await prisma.pjumBankAccount.upsert({
            where: {
                bmsNIK_bankAccountNo: {
                    bmsNIK: pjumExport.bmsNIK,
                    bankAccountNo: validated.bankAccountNo,
                },
            },
            create: {
                bmsNIK: pjumExport.bmsNIK,
                bankAccountNo: validated.bankAccountNo,
                bankAccountName: validated.bankAccountName,
                bankName: validated.bankName,
                addedByNIK: user.NIK,
            },
            update: {
                bankAccountName: validated.bankAccountName,
                bankName: validated.bankName,
                addedByNIK: user.NIK,
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

        revalidatePath("/reports/pjum/approval");
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
 * Reject a PJUM export (optional, for future use).
 */
export async function rejectPjumExport(input: {
    pjumExportId: string;
    notes: string;
}): Promise<{ error: string | null }> {
    try {
        const user = await requireRole("BNM_MANAGER");
        await validateCSRF(await headers());

        const pjumExport = await prisma.pjumExport.findUnique({
            where: { id: input.pjumExportId },
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

        await prisma.pjumExport.update({
            where: { id: pjumExport.id },
            data: {
                status: "REJECTED",
                approvedByNIK: user.NIK,
                approvedAt: new Date(),
                rejectionNotes: input.notes,
            },
        });

        // Unmark reports so they can be re-included in a new PJUM
        await prisma.report.updateMany({
            where: { reportNumber: { in: pjumExport.reportNumbers } },
            data: { pjumExportedAt: null },
        });

        logger.info(
            {
                operation: "rejectPjumExport",
                pjumExportId: pjumExport.id,
                rejectedBy: user.NIK,
            },
            "PJUM rejected",
        );

        revalidatePath("/reports/pjum/approval");
        return { error: null };
    } catch (error) {
        logger.error(
            { operation: "rejectPjumExport" },
            "Failed to reject PJUM",
            error,
        );
        return { error: "Terjadi kesalahan saat menolak PJUM" };
    }
}
