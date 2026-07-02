"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { getAuthUser, requireRole, validateCSRF } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getGoogleDriveClient } from "@/lib/google-drive/client";
import { deletePdfSnapshots } from "@/lib/pdf/snapshot-storage";
import { getPjumPolicySettings } from "@/lib/app-settings";
import { requiresPjum, resolveReportTotalRealisasi } from "@/lib/realisasi";
import { getJakartaDateRange } from "@/lib/time";

export type AdminPjumFilters = {
    search?: string;
    branchName?: string;
    areaName?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
};

export type PjumSummary = {
    total: number;
    pendingReview: number;
    approved: number;
    reportCount: number;
    stalePending: number;
    pendingStaleDays: number;
};

export type PjumRow = {
    id: string;
    weekNumber: number;
    branchName: string;
    areaNames: string[];
    bmsNIK: string;
    bmsName: string;
    fromDate: Date;
    toDate: Date;
    reportCount: number;
    reportNumbers: string[];
    status: string;
    pjumFinalDriveUrl: string | null;
    createdAt: Date;
    isStalePending: boolean;
};

export type DashboardPjumBmsUser = {
    NIK: string;
    name: string;
};

export type DashboardPjumCandidateRow = {
    reportNumber: string;
    finishedAt: string | null;
    createdAt: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    areaName: string | null;
    status: string;
    totalRealisasi: number;
    pjumExportedAt: string | null;
    isValid: boolean;
    invalidReason: string | null;
};

export type DashboardPjumCandidateResult = {
    rows: DashboardPjumCandidateRow[];
    eligibleCount: number;
    eligibleTotalRealisasi: number;
    blockedCount: number;
    unfinishedCount: number;
};

type DashboardPjumCandidate = {
    reportNumber: string;
    createdAt: Date;
    finishedAt: Date | null;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    areaName: string | null;
    status: string;
    totalReal: unknown;
    items: unknown;
    pjumExportedAt: Date | null;
};

function getPjumPeriodDate(report: DashboardPjumCandidate): Date {
    return report.finishedAt ?? report.createdAt;
}

function parsePjumDateRange(input: { from: string; to: string }) {
    const { start, endExclusive } = getJakartaDateRange(input.from, input.to);

    if (!start || !endExclusive) {
        throw new Error("Format tanggal tidak valid");
    }

    if (start > endExclusive) {
        throw new Error("Rentang tanggal tidak valid");
    }

    const toDate = new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000);

    return { fromDate: start, toDate, toEndOfDay: endExclusive };
}

async function getDashboardPjumReportsInRange(params: {
    bmsNIK: string;
    branchNames: string[];
    fromDate: Date;
    toDate: Date;
}): Promise<DashboardPjumCandidate[]> {
    const { bmsNIK, branchNames, fromDate, toDate } = params;

    const rows = await prisma.report.findMany({
        where: {
            createdByNIK: bmsNIK,
            branchName: { in: branchNames },
            OR: [
                {
                    status: "COMPLETED",
                    finishedAt: { not: null, gte: fromDate, lte: toDate },
                },
                {
                    status: { not: "COMPLETED" },
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
            areaName: true,
            status: true,
            totalReal: true,
            items: true,
            pjumExportedAt: true,
        },
    });

    return rows
        .map((row) => row as DashboardPjumCandidate)
        .sort(
            (left, right) =>
                getPjumPeriodDate(left).getTime() -
                getPjumPeriodDate(right).getTime(),
        );
}

export async function getDashboardPjumBmsUsers(): Promise<
    DashboardPjumBmsUser[]
> {
    const user = await requireRole("BMC");

    return prisma.user.findMany({
        where: {
            role: "BMS",
            branchNames: { hasSome: user.branchNames },
            deletedAt: null,
        },
        select: { NIK: true, name: true },
        orderBy: { name: "asc" },
    });
}

export async function searchDashboardPjumCandidates(input: {
    bmsNIK: string;
    from: string;
    to: string;
}): Promise<DashboardPjumCandidateResult> {
    const user = await requireRole("BMC");
    const bmsNIK = input.bmsNIK.trim();

    if (!bmsNIK) {
        return {
            rows: [],
            eligibleCount: 0,
            eligibleTotalRealisasi: 0,
            blockedCount: 0,
            unfinishedCount: 0,
        };
    }

    const bmsUser = await prisma.user.findUnique({
        where: { NIK: bmsNIK },
        select: { role: true, branchNames: true, deletedAt: true },
    });
    const hasBmsAccess =
        bmsUser?.role === "BMS" &&
        !bmsUser.deletedAt &&
        bmsUser.branchNames.some((branchName) =>
            user.branchNames.includes(branchName),
        );

    if (!hasBmsAccess) {
        return {
            rows: [],
            eligibleCount: 0,
            eligibleTotalRealisasi: 0,
            blockedCount: 0,
            unfinishedCount: 0,
        };
    }

    const { fromDate, toEndOfDay } = parsePjumDateRange(input);
    const reports = await getDashboardPjumReportsInRange({
        bmsNIK,
        branchNames: user.branchNames,
        fromDate,
        toDate: new Date(toEndOfDay.getTime() - 1), // to keep lte semantics if used
    });

    const reportNumbers = reports.map((report) => report.reportNumber);
    const activePjums =
        reportNumbers.length > 0
            ? await prisma.pjumExport.findMany({
                  where: {
                      status: { in: ["PENDING_APPROVAL", "APPROVED"] },
                      reportNumbers: { hasSome: reportNumbers },
                  },
                  select: { reportNumbers: true },
              })
            : [];
    const numbersInActivePjum = new Set(
        activePjums.flatMap((pjum) => pjum.reportNumbers),
    );

    let eligibleTotalRealisasi = 0;
    let eligibleCount = 0;
    let blockedCount = 0;
    let unfinishedCount = 0;

    const rows = reports.map((report): DashboardPjumCandidateRow => {
        const totalRealisasi = resolveReportTotalRealisasi(
            report.totalReal,
            report.items,
        );
        const reportRequiresPjum = requiresPjum(report.totalReal, report.items);
        const isAlreadyInPjum =
            Boolean(report.pjumExportedAt) ||
            numbersInActivePjum.has(report.reportNumber);
        const invalidReason =
            report.status !== "COMPLETED"
                ? "Belum selesai"
                : !reportRequiresPjum
                  ? "Tidak perlu PJUM"
                  : isAlreadyInPjum
                  ? "Sudah masuk PJUM"
                  : null;
        const isValid = invalidReason === null;

        if (isValid) {
            eligibleCount += 1;
            eligibleTotalRealisasi += totalRealisasi;
        } else {
            blockedCount += 1;
            if (report.status !== "COMPLETED") {
                unfinishedCount += 1;
            }
        }

        return {
            reportNumber: report.reportNumber,
            finishedAt: report.finishedAt?.toISOString() ?? null,
            createdAt: report.createdAt.toISOString(),
            storeName: report.storeName,
            storeCode: report.storeCode,
            branchName: report.branchName,
            areaName: report.areaName,
            status: report.status,
            totalRealisasi,
            pjumExportedAt: report.pjumExportedAt?.toISOString() ?? null,
            isValid,
            invalidReason,
        };
    });

    return {
        rows,
        eligibleCount,
        eligibleTotalRealisasi,
        blockedCount,
        unfinishedCount,
    };
}

export async function createDashboardPjum(input: {
    reportNumbers: string[];
    bmsNIK: string;
    from: string;
    to: string;
    weekNumber: number;
}): Promise<{ error: string | null; pjumExportId: string | null }> {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await requireRole("BMC");
        await validateCSRF(await headers());

        const bmsNIK = input.bmsNIK.trim();
        const safeNumbers = Array.from(
            new Set(input.reportNumbers.map((value) => value.trim())),
        ).filter((value) => value.length > 0);

        if (!bmsNIK) {
            return { error: "BMS wajib dipilih", pjumExportId: null };
        }

        if (safeNumbers.length === 0) {
            return {
                error: "Pilih minimal 1 laporan valid untuk dibuat PJUM",
                pjumExportId: null,
            };
        }

        if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1) {
            return {
                error: "Minggu ke harus diisi dengan angka valid",
                pjumExportId: null,
            };
        }

        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK },
            select: { role: true, branchNames: true, deletedAt: true },
        });
        const hasBmsAccess =
            bmsUser?.role === "BMS" &&
            !bmsUser.deletedAt &&
            bmsUser.branchNames.some((branchName) =>
                user.branchNames.includes(branchName),
            );

        if (!hasBmsAccess) {
            return {
                error: "BMS tidak valid atau berada di luar scope cabang",
                pjumExportId: null,
            };
        }

        const { fromDate, toDate, toEndOfDay } = parsePjumDateRange(input);
        const reports = await getDashboardPjumReportsInRange({
            bmsNIK,
            branchNames: user.branchNames,
            fromDate,
            toDate: new Date(toEndOfDay.getTime() - 1),
        });
        const reportMap = new Map(
            reports.map((report) => [report.reportNumber, report]),
        );

        const missingReport = safeNumbers.find(
            (reportNumber) => !reportMap.has(reportNumber),
        );
        if (missingReport) {
            return {
                error: `Laporan ${missingReport} tidak ada dalam periode atau cabang BMC ini`,
                pjumExportId: null,
            };
        }

        const invalidReport = safeNumbers
            .map((reportNumber) => reportMap.get(reportNumber))
            .find(
                (report) =>
                    !report ||
                    report.status !== "COMPLETED" ||
                    !requiresPjum(report.totalReal, report.items) ||
                    report.pjumExportedAt,
            );
        if (invalidReport) {
            return {
                error:
                    invalidReport.status !== "COMPLETED"
                        ? `Laporan ${invalidReport.reportNumber} belum SELESAI`
                        : !requiresPjum(
                                invalidReport.totalReal,
                                invalidReport.items,
                            )
                          ? `Laporan ${invalidReport.reportNumber} tidak memiliki biaya atau pekerjaan BMS yang perlu PJUM`
                        : `Laporan ${invalidReport.reportNumber} sudah masuk PJUM`,
                pjumExportId: null,
            };
        }

        const activeExportWithSelectedReports = await prisma.pjumExport.findFirst(
            {
                where: {
                    status: { in: ["PENDING_APPROVAL", "APPROVED"] },
                    reportNumbers: { hasSome: safeNumbers },
                },
                select: { id: true, reportNumbers: true },
            },
        );

        if (activeExportWithSelectedReports) {
            const duplicateNumbers =
                activeExportWithSelectedReports.reportNumbers.filter(
                    (reportNumber) => safeNumbers.includes(reportNumber),
                );
            return {
                error:
                    duplicateNumbers.length > 0
                        ? `Laporan ${duplicateNumbers.join(", ")} sudah masuk PJUM lain`
                        : "Beberapa laporan sudah masuk PJUM lain",
                pjumExportId: null,
            };
        }

        const selectedReports = safeNumbers
            .map((reportNumber) => reportMap.get(reportNumber))
            .filter((report): report is DashboardPjumCandidate => !!report);
        const branchNames = new Set(selectedReports.map((row) => row.branchName));
        if (branchNames.size !== 1) {
            return {
                error: "Laporan PJUM harus berasal dari satu cabang yang sama",
                pjumExportId: null,
            };
        }
        const branchName = selectedReports[0].branchName;
        const areaNames = [
            ...new Set(
                selectedReports
                    .map((report) => report.areaName)
                    .filter((areaName): areaName is string => Boolean(areaName)),
            ),
        ];

        const pjumExport = await prisma.$transaction(async (tx) => {
            const reportResult = await tx.report.updateMany({
                where: {
                    reportNumber: { in: safeNumbers },
                    status: "COMPLETED",
                    pjumExportedAt: null,
                    branchName,
                    createdByNIK: bmsNIK,
                },
                data: { pjumExportedAt: new Date() },
            });

            if (reportResult.count !== safeNumbers.length) {
                throw new Error(
                    "Data laporan berubah. Klik Cek Laporan lagi sebelum membuat PJUM",
                );
            }

            return tx.pjumExport.create({
                data: {
                    status: "PENDING_APPROVAL",
                    bmsNIK,
                    branchName,
                    areaNames,
                    weekNumber: input.weekNumber,
                    fromDate,
                    toDate,
                    reportNumbers: safeNumbers,
                    createdByNIK: user.NIK,
                },
            });
        });

        revalidatePath("/dashboard/pjum");
        revalidatePath(`/dashboard/pjum/${pjumExport.id}`);
        revalidatePath("/dashboard/reports");
        revalidatePath("/dashboard");
        revalidatePath("/reports/pjum");

        dispatchNotificationEvent({
            type: "PJUM_CREATED",
            actorNIK: user.NIK,
            pjumExportId: pjumExport.id,
        });

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            {
                operation: "createDashboardPjum",
                correlationId,
                durationMs,
                pjumExportId: pjumExport.id,
                bmsNIK,
                branchName,
                reportCount: safeNumbers.length,
            },
            "Created dashboard PJUM without temporary PDF",
        );

        return { error: null, pjumExportId: pjumExport.id };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "createDashboardPjum", correlationId, durationMs },
            "Failed to create dashboard PJUM",
            error,
        );
        return {
            error:
                error instanceof Error
                    ? error.message
                    : "Gagal membuat PJUM",
            pjumExportId: null,
        };
    }
}

export async function getAdminPjum(
    cursor: string | null,
    limit: number = 20,
    filters: AdminPjumFilters
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        const scopedBranchNames =
            user.role === "ADMIN"
                ? null
                : user.role === "BMC" || user.role === "BNM_MANAGER"
                  ? user.branchNames.filter(
                        (branchName) => branchName.trim() !== "",
                    )
                  : undefined;

        if (scopedBranchNames === undefined) {
            throw new Error("Unauthorized");
        }

        const pjumPolicy = await getPjumPolicySettings();
        const staleBefore = getStalePendingCutoff(
            pjumPolicy.pendingStaleDays,
        );
        const baseWhere: Prisma.PjumExportWhereInput =
            scopedBranchNames === null
                ? { NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } }
                : { branchName: { in: scopedBranchNames } };

        if (filters.search) {
            const search = filters.search.trim();
            // Because PjumExport doesn't have a relation to User in Prisma schema,
            // we find matching NIKs first based on the name
            const matchingUsers = await prisma.user.findMany({
                where: { name: { contains: search, mode: "insensitive" } },
                select: { NIK: true }
            });
            const matchedNIKs = matchingUsers.map(u => u.NIK);

            baseWhere.OR = [
                { bmsNIK: { contains: search, mode: "insensitive" } },
                { branchName: { contains: search, mode: "insensitive" } },
                { reportNumbers: { has: search } },
                ...(matchedNIKs.length > 0 ? [{ bmsNIK: { in: matchedNIKs } }] : []),
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            if (
                scopedBranchNames === null ||
                scopedBranchNames.includes(filters.branchName)
            ) {
                baseWhere.branchName = filters.branchName;
            } else {
                baseWhere.branchName = { in: [] };
            }
        }

        if (filters.areaName && filters.areaName !== "all") {
            if (
                scopedBranchNames === null ||
                user.areaNames.length === 0 ||
                user.areaNames.includes(filters.areaName)
            ) {
                baseWhere.areaNames = { has: filters.areaName };
            } else {
                baseWhere.areaNames = { has: "__NO_AREA_SCOPE__" };
            }
        }

        if (filters.fromDate || filters.toDate) {
            const { start, endExclusive } = getJakartaDateRange(
                filters.fromDate,
                filters.toDate,
            );

            baseWhere.createdAt = {
                ...(start ? { gte: start } : {}),
                ...(endExclusive ? { lt: endExclusive } : {}),
            };
        }

        const where: Prisma.PjumExportWhereInput = { ...baseWhere };
        if (filters.status && filters.status !== "all") {
            where.status = filters.status as Prisma.EnumPjumStatusFilter["equals"];
        }

        const [totalCount, summaryRows, pjumExports] = await Promise.all([
            prisma.pjumExport.count({ where }),
            prisma.pjumExport.findMany({
                where: baseWhere,
                select: {
                    status: true,
                    reportNumbers: true,
                    createdAt: true,
                },
            }),
            prisma.pjumExport.findMany({
                where,
                take: limit + 1,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                select: {
                    id: true,
                    weekNumber: true,
                    branchName: true,
                    areaNames: true,
                    bmsNIK: true,
                    fromDate: true,
                    toDate: true,
                    status: true,
                    reportNumbers: true,
                    pjumFinalDriveUrl: true,
                    createdAt: true,
                },
            }),
        ]);

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

        const summary: PjumSummary = summaryRows.reduce(
            (acc, row) => {
                acc.total += 1;
                acc.reportCount += row.reportNumbers.length;

                if (row.status === "PENDING_APPROVAL") {
                    acc.pendingReview += 1;
                    if (row.createdAt < staleBefore) {
                        acc.stalePending += 1;
                    }
                }

                if (row.status === "APPROVED") {
                    acc.approved += 1;
                }

                return acc;
            },
            {
                total: 0,
                pendingReview: 0,
                approved: 0,
                reportCount: 0,
                stalePending: 0,
                pendingStaleDays: pjumPolicy.pendingStaleDays,
            },
        );

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminPjum", correlationId, durationMs, count: pjumExports.length },
            "Fetched admin PJUM successfully"
        );

        const rows: PjumRow[] = pjumExports.map((p) => ({
            id: p.id,
            weekNumber: p.weekNumber,
            branchName: p.branchName,
            areaNames: p.areaNames,
            bmsNIK: p.bmsNIK,
            bmsName: nameMap.get(p.bmsNIK) || p.bmsNIK,
            fromDate: p.fromDate,
            toDate: p.toDate,
            reportCount: p.reportNumbers.length,
            reportNumbers: p.reportNumbers,
            status: p.status,
            pjumFinalDriveUrl: p.pjumFinalDriveUrl,
            createdAt: p.createdAt,
            isStalePending:
                p.status === "PENDING_APPROVAL" && p.createdAt < staleBefore,
        }));

        return {
            pjums: rows,
            nextCursor,
            totalCount,
            summary,
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

function getStalePendingCutoff(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
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

        if (
            pjumExport.branchName === EXCLUDED_ADMIN_BRANCH_NAME
        ) {
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
        revalidatePath(`/dashboard/pjum/${pjumExport.id}`);
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
