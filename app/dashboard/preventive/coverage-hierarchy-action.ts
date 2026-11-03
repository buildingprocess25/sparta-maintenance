"use server";

import prisma from "@/lib/prisma";
import { getJakartaQuarterWindow, getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { type StoreBrandFilter, getStoreBrandWhere } from "@/lib/store-brand-filter";
import { isRecordedPreventiveReport } from "@/lib/report-preventive";
import {
    buildCoverageHierarchy,
    type BranchCoverageHierarchy,
    type CoverageReportInfo,
} from "./coverage-hierarchy";

export async function getBmsCoverageHierarchy(params?: {
    year?: number;
    quarter?: 1 | 2 | 3 | 4;
    branchName?: string;
    brand?: StoreBrandFilter;
}): Promise<BranchCoverageHierarchy[]> {
    const year = params?.year ?? getJakartaYear();
    const quarter = params?.quarter ?? getJakartaCurrentQuarter();
    const branchFilter = params?.branchName?.trim();
    const brandFilter = params?.brand ?? "ALL";

    const { start, endExclusive } = getJakartaQuarterWindow(year, quarter);

    // Filter brand toko jika ada
    const brandWhere =
        brandFilter && brandFilter !== "ALL"
            ? getStoreBrandWhere(brandFilter)
            : {};

    // 1. Ambil semua toko aktif (sama dengan populasi card) beserta penugasan aktifnya
    const stores = await prisma.store.findMany({
        where: {
            isActive: true,
            branchName: {
                not: EXCLUDED_ADMIN_BRANCH_NAME,
                ...(branchFilter && branchFilter !== "all"
                    ? { equals: branchFilter }
                    : {}),
            },
            ...brandWhere,
        },
        select: {
            code: true,
            name: true,
            branchName: true,
            storeAssignments: {
                where: { isActive: true },
                select: {
                    bmsNIK: true,
                    bms: { select: { name: true } },
                },
            },
        },
    });

    if (stores.length === 0) {
        return [];
    }

    // 2. Query laporan preventif selesai pada kuartal tersebut
    const completedReports = await prisma.report.findMany({
        where: {
            storeCode: { in: stores.map((s) => s.code) },
            createdAt: {
                gte: start,
                lt: endExclusive,
            },
            status: { not: "DRAFT" },
        },
        select: {
            storeCode: true,
            reportNumber: true,
            createdAt: true,
            status: true,
            items: true,
            createdByNIK: true,
            createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const reportByStore = new Map<string, CoverageReportInfo>();
    for (const rep of completedReports) {
        if (!rep.storeCode || !isRecordedPreventiveReport(rep)) continue;
        const existing = reportByStore.get(rep.storeCode);
        if (!existing || rep.createdAt > new Date(existing.doneAt)) {
            reportByStore.set(rep.storeCode, {
                reportNumber: rep.reportNumber,
                doneAt: rep.createdAt.toISOString(),
                doneByName: rep.createdBy?.name || rep.createdByNIK,
            });
        }
    }

    // 3. Kelompokkan Cabang -> BMS -> Toko, toko tanpa BMS ke grup unassigned
    return buildCoverageHierarchy(
        stores.map((s) => ({
            code: s.code,
            name: s.name,
            branchName: s.branchName,
            assignments: s.storeAssignments.map((a) => ({
                bmsNIK: a.bmsNIK,
                bmsName: a.bms?.name ?? null,
            })),
        })),
        reportByStore,
    );
}
