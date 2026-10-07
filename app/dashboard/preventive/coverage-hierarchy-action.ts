"use server";

import prisma from "@/lib/prisma";
import { getJakartaQuarterWindow, getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { type StoreBrandFilter, getStoreBrandWhere } from "@/lib/store-brand-filter";
import { isRecordedPreventiveReport } from "@/lib/report-preventive";

export type StoreCoverageHierarchyItem = {
    storeCode: string;
    storeName: string;
    isCompleted: boolean;
    doneAt?: string;
    reportNumber?: string;
};

export type BmsCoverageHierarchyItem = {
    nik: string;
    name: string;
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    kpiRate: number;
    stores: StoreCoverageHierarchyItem[];
};

export type BranchCoverageHierarchy = {
    branchName: string;
    bmsCount: number;
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    coverageRate: number;
    bmsList: BmsCoverageHierarchyItem[];
};

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

    // 1. Ambil semua penugasan aktif
    const assignments = await prisma.bmsStoreAssignment.findMany({
        where: {
            isActive: true,
            store: {
                branchName: {
                    not: EXCLUDED_ADMIN_BRANCH_NAME,
                    ...(branchFilter && branchFilter !== "all"
                        ? { equals: branchFilter }
                        : {}),
                },
                ...brandWhere,
            },
        },
        select: {
            storeCode: true,
            bmsNIK: true,
            store: {
                select: {
                    code: true,
                    name: true,
                    branchName: true,
                },
            },
            bms: {
                select: {
                    NIK: true,
                    name: true,
                },
            },
        },
    });

    if (assignments.length === 0) {
        return [];
    }

    const uniqueStoreCodes = Array.from(new Set(assignments.map((a) => a.storeCode)));

    // 2. Query laporan preventif selesai pada kuartal tersebut
    const completedReports = await prisma.report.findMany({
        where: {
            storeCode: { in: uniqueStoreCodes },
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
        },
        orderBy: { createdAt: "desc" },
    });

    const storeReportMap = new Map<string, { reportNumber: string; doneAt: string }>();
    for (const rep of completedReports) {
        if (rep.storeCode && isRecordedPreventiveReport(rep)) {
            if (
                !storeReportMap.has(rep.storeCode) ||
                new Date(rep.createdAt) >
                    new Date(storeReportMap.get(rep.storeCode)!.doneAt)
            ) {
                storeReportMap.set(rep.storeCode, {
                    reportNumber: rep.reportNumber,
                    doneAt: rep.createdAt.toISOString(),
                });
            }
        }
    }

    // 3. Kelompokkan berdasarkan Cabang -> BMS -> Toko
    type BmsAccumulator = {
        nik: string;
        name: string;
        stores: StoreCoverageHierarchyItem[];
    };

    const branchMap = new Map<string, Map<string, BmsAccumulator>>();

    for (const a of assignments) {
        const branchName = a.store.branchName || "TANPA CABANG";
        if (!branchMap.has(branchName)) {
            branchMap.set(branchName, new Map());
        }
        const bmsMap = branchMap.get(branchName)!;

        const bmsNik = a.bmsNIK;
        const bmsName = a.bms?.name || bmsNik;

        if (!bmsMap.has(bmsNik)) {
            bmsMap.set(bmsNik, {
                nik: bmsNik,
                name: bmsName,
                stores: [],
            });
        }

        const bmsEntry = bmsMap.get(bmsNik)!;
        const report = storeReportMap.get(a.storeCode);
        const isCompleted = !!report;

        // Hindari duplikasi store per BMS
        if (!bmsEntry.stores.some((s) => s.storeCode === a.storeCode)) {
            bmsEntry.stores.push({
                storeCode: a.store.code,
                storeName: a.store.name,
                isCompleted,
                doneAt: report?.doneAt,
                reportNumber: report?.reportNumber,
            });
        }
    }

    // 4. Transformasi ke format BranchCoverageHierarchy[]
    const results: BranchCoverageHierarchy[] = [];

    for (const [bName, bmsMap] of branchMap.entries()) {
        const bmsList: BmsCoverageHierarchyItem[] = [];
        let branchTotalStores = 0;
        let branchCompletedStores = 0;

        for (const bms of bmsMap.values()) {
            bms.stores.sort((a, b) => a.storeName.localeCompare(b.storeName));

            const totalStores = bms.stores.length;
            const completedStores = bms.stores.filter((s) => s.isCompleted).length;
            const pendingStores = Math.max(0, totalStores - completedStores);
            const kpiRate =
                totalStores > 0
                    ? Math.round((completedStores / totalStores) * 1000) / 10
                    : 0;

            branchTotalStores += totalStores;
            branchCompletedStores += completedStores;

            bmsList.push({
                nik: bms.nik,
                name: bms.name,
                totalStores,
                completedStores,
                pendingStores,
                kpiRate,
                stores: bms.stores,
            });
        }

        bmsList.sort((a, b) => a.name.localeCompare(b.name));

        const branchPendingStores = Math.max(
            0,
            branchTotalStores - branchCompletedStores,
        );
        const branchCoverageRate =
            branchTotalStores > 0
                ? Math.round((branchCompletedStores / branchTotalStores) * 1000) /
                  10
                : 0;

        results.push({
            branchName: bName,
            bmsCount: bmsList.length,
            totalStores: branchTotalStores,
            completedStores: branchCompletedStores,
            pendingStores: branchPendingStores,
            coverageRate: branchCoverageRate,
            bmsList,
        });
    }

    results.sort((a, b) => a.branchName.localeCompare(b.branchName));

    return results;
}
