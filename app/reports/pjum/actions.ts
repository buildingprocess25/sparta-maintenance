"use server";

import prisma from "@/lib/prisma";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";

export type PjumBmsUser = {
    NIK: string;
    name: string;
};

export type PjumReportRow = {
    reportNumber: string;
    createdAt: string; // ISO string
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    totalEstimation: number;
    pjumExportedAt: string | null; // ISO string or null
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
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // include full last day

        const reports = await prisma.report.findMany({
            where: {
                createdByNIK: bmsNIK,
                branchName: { in: user.branchNames },
                status: { not: "DRAFT" },
                createdAt: { gte: fromDate, lte: toDate },
            },
            select: {
                reportNumber: true,
                createdAt: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                totalEstimation: true,
                pjumExportedAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const data: PjumReportRow[] = reports.map((r) => ({
            reportNumber: r.reportNumber,
            createdAt: r.createdAt.toISOString(),
            storeName: r.storeName,
            storeCode: r.storeCode,
            branchName: r.branchName,
            status: r.status as string,
            totalEstimation: Number(r.totalEstimation),
            pjumExportedAt: r.pjumExportedAt
                ? r.pjumExportedAt.toISOString()
                : null,
        }));

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
}): Promise<{ error: string | null; pjumExportId: string | null }> {
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

        const reports = await prisma.report.findMany({
            where: { reportNumber: { in: safeNumbers } },
            select: {
                reportNumber: true,
                status: true,
                branchName: true,
                pjumExportedAt: true,
            },
        });

        if (reports.length !== safeNumbers.length) {
            return { error: "Beberapa laporan tidak ditemukan", pjumExportId: null };
        }

        for (const r of reports) {
            if (!user.branchNames.includes(r.branchName)) {
                return { error: "Laporan tidak dalam cabang Anda", pjumExportId: null };
            }
            if (r.status !== "COMPLETED") {
                return {
                    error: `Laporan ${r.reportNumber} belum selesai — PJUM hanya dapat dibuat dari laporan yang sudah SELESAI`,
                    pjumExportId: null,
                };
            }
            if (r.pjumExportedAt) {
                return {
                    error: `Laporan ${r.reportNumber} sudah pernah dimasukkan dalam PJUM sebelumnya`,
                    pjumExportId: null,
                };
            }
        }

        const branchName = reports[0].branchName;
        const fromDate = new Date(from);
        const toDate = new Date(to);

        // Create PjumExport record in PENDING_APPROVAL status
        const pjumExport = await prisma.pjumExport.create({
            data: {
                status: "PENDING_APPROVAL",
                bmsNIK,
                branchName,
                weekNumber,
                fromDate,
                toDate,
                reportNumbers: safeNumbers,
                createdByNIK: user.NIK,
            },
        });

        // Mark reports as included in PJUM
        await prisma.report.updateMany({
            where: { reportNumber: { in: safeNumbers } },
            data: { pjumExportedAt: new Date() },
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
        return { error: null, pjumExportId: pjumExport.id };
    } catch (error) {
        logger.error({ operation: "exportPjum" }, "Failed to create PJUM", error);
        return { error: "Terjadi kesalahan saat membuat PJUM", pjumExportId: null };
    }
}
