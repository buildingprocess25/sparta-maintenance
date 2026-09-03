/**
 * lib/balance.ts
 *
 * Core helper untuk manajemen Saldo Operasional BMS (Rp 1.000.000 / periode).
 *
 * Aturan Bisnis:
 * - Saldo berlaku per BMS per periode aktif (BmsBalancePeriod).
 * - Hanya laporan dengan item RUSAK handler BMS yang memotong saldo.
 * - Estimasi > sisa saldo: HARD BLOCK (tidak boleh submit).
 * - Realisasi > sisa saldo: SOFT BLOCK (boleh submit, wajib isi unexpectedCostNotes).
 * - Pembuatan PJUM oleh BMC: mengunci periode (LOCKED_PJUM).
 * - BNM Approve PJUM: menutup periode lama, membuat periode baru dengan saldo reset.
 * - BNM Reject PJUM: unlock periode, lanjutkan dengan saldo sebelum lock.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBmsInitialBalance } from "@/lib/app-settings";
import type { ReportStatusKey } from "@/lib/report-status";
import { requiresPjum } from "@/lib/realisasi";
import { classifyPjumApprovalReports } from "@/lib/pjum-hanging";
import { isActivePjumHangingReport } from "@/lib/pjum-hanging";
import { summarizeBmsBalanceAmounts } from "@/lib/bms-balance-calculation";

export type BmsHangingReportSummary = {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    finishedAt: Date | null;
    realizedAmount: number;
};

export async function getOmittedHangingReportsForPjum(input: {
    pjumExportId: string;
    approvedReportNumbers: string[];
}) {
    const reports = await prisma.report.findMany({
        where: {
            reportNumber: { notIn: input.approvedReportNumbers },
            pjumHangingAt: { not: null },
            pjumExpiredAt: null,
            pjumExportedAt: null,
            balancePeriod: {
                pjumExportId: input.pjumExportId,
                status: "LOCKED_PJUM",
            },
        },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            finishedAt: true,
            totalReal: true,
        },
        orderBy: { finishedAt: "asc" },
    });

    return reports.map((report) => ({
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode,
        finishedAt: report.finishedAt,
        realizedAmount: report.totalReal
            ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
            : 0,
    }));
}

export async function getIncludedHangingReportsForPjum(input: {
    approvedReportNumbers: string[];
}) {
    if (input.approvedReportNumbers.length === 0) return [];

    const reports = await prisma.report.findMany({
        where: {
            reportNumber: { in: input.approvedReportNumbers },
            pjumHangingAt: { not: null },
            pjumExpiredAt: null,
            pjumExportedAt: { not: null },
        },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            finishedAt: true,
            totalReal: true,
        },
        orderBy: { finishedAt: "asc" },
    });

    return reports.map((report) => ({
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode,
        finishedAt: report.finishedAt,
        realizedAmount: report.totalReal
            ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
            : 0,
    }));
}

export type BmsBalanceHistoryItem = {
    reportNumber: string;
    storeName: string;
    storeCode: string;
    status: ReportStatusKey;
    createdAt: Date;
    consumedAmount: number;
    type: "ESTIMATED" | "REALIZED";
    isHanging: boolean;
};

export type BmsBalanceInfo = {
    periodId: string | null;
    periodStatus: "ACTIVE" | "LOCKED_PJUM" | "CLOSED" | null;
    initialBalance: number;
    /** Total estimasi aktif dari laporan yang masih berjalan */
    totalEstimated: number;
    /** Total realisasi dari laporan yang COMPLETED dalam periode ini */
    totalRealized: number;
    /** Realisasi laporan gantung dari periode sebelumnya */
    hangingDeduction: number;
    /** Realisasi laporan baru pada periode berjalan */
    currentPeriodRealized: number;
    hangingReports: BmsHangingReportSummary[];
    /** Sisa saldo tersedia (initialBalance - totalRealized - totalEstimatedInProgress) */
    availableBalance: number;
    isLocked: boolean;
};

/**
 * Ambil atau buat periode aktif untuk BMS.
 * Jika tidak ada periode ACTIVE, kembalikan null (BMS harus tunggu admin/sistem buat periode).
 */
export async function getBmsActivePeriod(bmsNIK: string) {
    const period = await prisma.bmsBalancePeriod.findFirst({
        where: {
            bmsNIK,
            status: { in: ["ACTIVE", "LOCKED_PJUM"] },
        },
        orderBy: { createdAt: "desc" },
    });

    return period;
}

/**
 * Buat periode baru untuk BMS dengan saldo initial Rp 1.000.000.
 * Digunakan saat BNM menyetujui PJUM (reset saldo).
 */
export async function createNewBmsPeriod(
    bmsNIK: string,
    pjumExportId?: string,
) {
    const initialBalanceVal = await getBmsInitialBalance();
    return prisma.bmsBalancePeriod.create({
        data: {
            bmsNIK,
            initialBalance: new Prisma.Decimal(initialBalanceVal),
            status: "ACTIVE",
            pjumExportId: pjumExportId ?? null,
        },
    });
}

/**
 * Hitung informasi saldo BMS secara real-time berdasarkan laporan yang
 * masuk ke periode aktif.
 *
 * Saldo terpotong dihitung dari:
 * - totalReal (realisasi) laporan yang COMPLETED dalam periode ini
 * - totalEstimation laporan yang masih IN_PROGRESS / PENDING_REVIEW / APPROVED_BMC
 */
export async function calculateBmsBalance(
    bmsNIK: string,
): Promise<BmsBalanceInfo> {
    const period = await getBmsActivePeriod(bmsNIK);

    if (!period) {
        // Belum ada periode aktif — kembalikan saldo penuh sebagai default
        const initialBalanceVal = await getBmsInitialBalance();
        return {
            periodId: null,
            periodStatus: null,
            initialBalance: initialBalanceVal,
            totalEstimated: 0,
            totalRealized: 0,
            hangingDeduction: 0,
            currentPeriodRealized: 0,
            hangingReports: [],
            availableBalance: initialBalanceVal,
            isLocked: false,
        };
    }

    // Ambil semua laporan dalam periode ini
    const reports = await prisma.report.findMany({
        where: {
            balancePeriodId: period.id,
            createdByNIK: bmsNIK,
        },
        select: {
            status: true,
            totalEstimation: true,
            totalReal: true,
            items: true,
            reportNumber: true,
            storeName: true,
            storeCode: true,
            finishedAt: true,
            pjumExportedAt: true,
            pjumHangingAt: true,
            pjumExpiredAt: true,
        },
    });

    const completedAmounts: Array<{ amount: number; isHanging: boolean }> = [];
    const hangingReports: BmsHangingReportSummary[] = [];
    let totalEstimatedInProgress = 0;

    for (const report of reports) {
        const hasBmsWork = hasBmsRepairItems(report.items);
        if (!hasBmsWork) continue;

        if (report.status === "COMPLETED") {
            // Gunakan realisasi aktual jika sudah selesai
            const real = report.totalReal
                ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
                : new Prisma.Decimal(report.totalEstimation.toString()).toNumber();
            const isHanging = isActivePjumHangingReport(report);
            completedAmounts.push({ amount: real, isHanging });
            if (isHanging) {
                hangingReports.push({
                    reportNumber: report.reportNumber,
                    storeName: report.storeName,
                    storeCode: report.storeCode,
                    finishedAt: report.finishedAt,
                    realizedAmount: real,
                });
            }
        } else if (
            [
                "PENDING_ESTIMATION",
                "ESTIMATION_REJECTED_REVISION",
                "ESTIMATION_APPROVED",
                "IN_PROGRESS",
                "PENDING_REVIEW",
                "APPROVED_BMC",
                "REVIEW_REJECTED_REVISION",
            ].includes(report.status)
        ) {
            // Estimasi di-reserve sejak submit (PENDING_ESTIMATION) untuk
            // mencegah BMS spam-submit beberapa laporan yang akumulasinya
            // melampaui limit. Saldo otomatis kembali jika BMC menolak
            // permanen (ESTIMATION_REJECTED) karena status itu tidak
            // termasuk di sini.
            
            // Jika laporan berada di fase penyelesaian (sudah di-submit aktualnya),
            // gunakan totalReal. Jika belum, gunakan totalEstimation awal.
            const hasRealization = [
                "PENDING_REVIEW", 
                "APPROVED_BMC", 
                "REVIEW_REJECTED_REVISION"
            ].includes(report.status) && report.totalReal !== null;

            const reservedCost = hasRealization 
                ? new Prisma.Decimal(report.totalReal!.toString()).toNumber()
                : new Prisma.Decimal(report.totalEstimation.toString()).toNumber();

            totalEstimatedInProgress += reservedCost;
        }
    }

    const initialBalance = new Prisma.Decimal(period.initialBalance.toString()).toNumber();
    const summary = summarizeBmsBalanceAmounts({
        initialBalance,
        completed: completedAmounts,
        estimatedInProgress: totalEstimatedInProgress,
    });

    return {
        periodId: period.id,
        periodStatus: period.status as BmsBalanceInfo["periodStatus"],
        initialBalance,
        totalEstimated: summary.totalEstimated,
        totalRealized: summary.totalRealized,
        hangingDeduction: summary.hangingDeduction,
        currentPeriodRealized: summary.currentPeriodRealized,
        hangingReports,
        availableBalance: summary.availableBalance,
        isLocked: period.status === "LOCKED_PJUM",
    };
}

/**
 * Validasi apakah BMS bisa submit laporan dengan jumlah estimasi tertentu.
 * Returns error message string jika tidak valid, null jika valid.
 */
export async function validateEstimationLimit(
    bmsNIK: string,
    estimationAmount: number,
): Promise<string | null> {
    const balance = await calculateBmsBalance(bmsNIK);

    if (balance.isLocked) {
        return "Saldo operasional Anda sedang terkunci karena ada PJUM yang menunggu persetujuan BNM. Harap tunggu hingga PJUM diproses.";
    }

    if (estimationAmount > balance.availableBalance) {
        const formatter = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        });
        return `Estimasi biaya ${formatter.format(estimationAmount)} melebihi sisa saldo operasional Anda sebesar ${formatter.format(balance.availableBalance)}. Harap sesuaikan estimasi atau koordinasikan dengan BMC.`;
    }

    return null;
}

/**
 * Cek apakah BMS sedang terkunci oleh PJUM.
 */
export async function isBmsLockedByPjum(bmsNIK: string): Promise<boolean> {
    const period = await getBmsActivePeriod(bmsNIK);
    return period?.status === "LOCKED_PJUM";
}

/**
 * Kunci periode aktif BMS saat BMC membuat PJUM.
 */
export async function lockBmsPeriodForPjum(
    bmsNIK: string,
    pjumExportId: string,
) {
    const period = await getBmsActivePeriod(bmsNIK);
    if (!period || period.status !== "ACTIVE") return null;

    return prisma.bmsBalancePeriod.update({
        where: { id: period.id },
        data: {
            status: "LOCKED_PJUM",
            pjumExportId,
        },
    });
}

/**
 * Reset saldo BMS setelah PJUM disetujui oleh BNM:
 * 1. Tutup periode lama (status CLOSED)
 * 2. Buat periode baru dengan saldo Rp 1.000.000
 */
export async function approvePjumAndTransitionBmsBalance(
    bmsNIK: string,
    pjumExport: {
        id: string;
        reportNumbers: string[];
        fromDate: Date;
        toDate: Date;
        approvedByNIK: string;
        approvedAt: Date;
        pjumFinalDriveUrl: string;
    },
) {
    const initialBalanceVal = await getBmsInitialBalance();
    const transitionAt = new Date();
    const toEndExclusive = new Date(
        pjumExport.toDate.getTime() + 24 * 60 * 60 * 1000,
    );

    return prisma.$transaction(async (tx) => {
        const approvalResult = await tx.pjumExport.updateMany({
            where: {
                id: pjumExport.id,
                status: "PENDING_APPROVAL",
            },
            data: {
                status: "APPROVED",
                approvedByNIK: pjumExport.approvedByNIK,
                approvedAt: pjumExport.approvedAt,
                pjumFinalDriveUrl: pjumExport.pjumFinalDriveUrl,
            },
        });
        if (approvalResult.count !== 1) {
            throw new Error("PJUM sudah diproses atau statusnya berubah");
        }

        const period = await tx.bmsBalancePeriod.findFirst({
            where: {
                bmsNIK,
                status: { in: ["ACTIVE", "LOCKED_PJUM"] },
            },
            orderBy: { createdAt: "desc" },
        });

        const reports = await tx.report.findMany({
            where: {
                createdByNIK: bmsNIK,
                OR: [
                    ...(period ? [{ balancePeriodId: period.id }] : []),
                    {
                        finishedAt: {
                            gte: pjumExport.fromDate,
                            lt: toEndExclusive,
                        },
                    },
                ],
            },
            select: {
                reportNumber: true,
                status: true,
                finishedAt: true,
                totalReal: true,
                items: true,
                pjumExportedAt: true,
                pjumHangingAt: true,
                pjumExpiredAt: true,
            },
        });

        const classification = classifyPjumApprovalReports({
            reports: reports.map((report) => ({
                reportNumber: report.reportNumber,
                status: report.status,
                finishedAt: report.finishedAt,
                requiresPjum: requiresPjum(report.totalReal, report.items),
                pjumExportedAt: report.pjumExportedAt,
                pjumHangingAt: report.pjumHangingAt,
                pjumExpiredAt: report.pjumExpiredAt,
            })),
            approvedReportNumbers: pjumExport.reportNumbers,
            fromDate: pjumExport.fromDate,
            toEndExclusive,
        });

        if (period) {
            await tx.bmsBalancePeriod.update({
                where: { id: period.id },
                data: {
                    status: "CLOSED",
                    closedAt: transitionAt,
                },
            });
        }

        const nextPeriod = await tx.bmsBalancePeriod.create({
            data: {
                bmsNIK,
                initialBalance: new Prisma.Decimal(initialBalanceVal),
                status: "ACTIVE",
                pjumExportId: pjumExport.id,
            },
        });

        if (classification.expireReportNumbers.length > 0) {
            await tx.report.updateMany({
                where: {
                    reportNumber: {
                        in: classification.expireReportNumbers,
                    },
                    pjumHangingAt: { not: null },
                    pjumExpiredAt: null,
                    pjumExportedAt: null,
                },
                data: { pjumExpiredAt: transitionAt },
            });
        }

        if (classification.carryReportNumbers.length > 0) {
            await tx.report.updateMany({
                where: {
                    reportNumber: { in: classification.carryReportNumbers },
                    status: "COMPLETED",
                    pjumHangingAt: null,
                    pjumExpiredAt: null,
                    pjumExportedAt: null,
                },
                data: {
                    balancePeriodId: nextPeriod.id,
                    pjumHangingAt: transitionAt,
                },
            });
        }

        return {
            period: nextPeriod,
            carriedReportNumbers: classification.carryReportNumbers,
            expiredReportNumbers: classification.expireReportNumbers,
        };
    });
}

/**
 * Buka kuncian periode BMS setelah PJUM ditolak oleh BNM.
 * Periode kembali ke ACTIVE, BMS bisa buat laporan kembali.
 */
export async function unlockBmsPeriodAfterPjumRejection(bmsNIK: string) {
    const period = await getBmsActivePeriod(bmsNIK);
    if (!period || period.status !== "LOCKED_PJUM") return null;

    return prisma.bmsBalancePeriod.update({
        where: { id: period.id },
        data: {
            status: "ACTIVE",
            pjumExportId: null,
        },
    });
}

/**
 * Cek apakah laporan ini memiliki item rusak yang dihandle oleh BMS.
 * Hanya laporan seperti ini yang memotong saldo operasional.
 */
export function hasBmsRepairItems(items: unknown): boolean {
    if (!Array.isArray(items)) return false;
    return items.some(
        (item) =>
            item &&
            typeof item === "object" &&
            (item as Record<string, unknown>).condition === "RUSAK" &&
            (item as Record<string, unknown>).handler === "BMS",
    );
}

/**
 * Mengambil history riwayat penggunaan saldo untuk periode aktif BMS.
 * Format yang di-return adalah list report yang sedang berjalan atau sudah selesai
 * beserta nominal uang yang memotong saldo.
 */
export async function getBmsBalanceHistory(
    bmsNIK: string,
): Promise<BmsBalanceHistoryItem[]> {
    const period = await getBmsActivePeriod(bmsNIK);

    if (!period) return [];

    const reports = await prisma.report.findMany({
        where: {
            balancePeriodId: period.id,
            createdByNIK: bmsNIK,
        },
        select: {
            reportNumber: true,
            status: true,
            totalEstimation: true,
            totalReal: true,
            createdAt: true,
            items: true,
            storeName: true,
            storeCode: true,
            pjumExportedAt: true,
            pjumHangingAt: true,
            pjumExpiredAt: true,
            store: {
                select: {
                    name: true,
                    code: true,
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    const history: BmsBalanceHistoryItem[] = [];

    for (const report of reports) {
        const hasBmsWork = hasBmsRepairItems(report.items);
        if (!hasBmsWork) continue;

        if (report.status === "COMPLETED") {
            const real = report.totalReal
                ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
                : new Prisma.Decimal(report.totalEstimation.toString()).toNumber();
            history.push({
                reportNumber: report.reportNumber,
                storeName: report.store?.name ?? report.storeName,
                storeCode: report.store?.code ?? report.storeCode ?? "-",
                status: report.status as ReportStatusKey,
                createdAt: report.createdAt,
                consumedAmount: real,
                type: "REALIZED",
                isHanging: isActivePjumHangingReport(report),
            });
        } else if (
            [
                "PENDING_ESTIMATION",
                "ESTIMATION_REJECTED_REVISION",
                "ESTIMATION_APPROVED",
                "IN_PROGRESS",
                "PENDING_REVIEW",
                "APPROVED_BMC",
                "REVIEW_REJECTED_REVISION",
            ].includes(report.status)
        ) {
            const hasRealization = [
                "PENDING_REVIEW", 
                "APPROVED_BMC", 
                "REVIEW_REJECTED_REVISION"
            ].includes(report.status) && report.totalReal !== null;

            const reservedCost = hasRealization 
                ? new Prisma.Decimal(report.totalReal!.toString()).toNumber()
                : new Prisma.Decimal(report.totalEstimation.toString()).toNumber();

            history.push({
                reportNumber: report.reportNumber,
                storeName: report.store?.name ?? report.storeName,
                storeCode: report.store?.code ?? report.storeCode ?? "-",
                status: report.status as ReportStatusKey,
                createdAt: report.createdAt,
                consumedAmount: reservedCost,
                type: "ESTIMATED",
                isHanging: false,
            });
        }
    }

    return history;
}
