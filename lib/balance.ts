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

export const BMS_INITIAL_BALANCE = new Prisma.Decimal(1_000_000);

export type BmsBalanceInfo = {
    periodId: string | null;
    periodStatus: "ACTIVE" | "LOCKED_PJUM" | "CLOSED" | null;
    initialBalance: number;
    /** Total estimasi aktif dari laporan yang masih berjalan */
    totalEstimated: number;
    /** Total realisasi dari laporan yang COMPLETED dalam periode ini */
    totalRealized: number;
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
    return prisma.bmsBalancePeriod.create({
        data: {
            bmsNIK,
            initialBalance: BMS_INITIAL_BALANCE,
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
        return {
            periodId: null,
            periodStatus: null,
            initialBalance: BMS_INITIAL_BALANCE.toNumber(),
            totalEstimated: 0,
            totalRealized: 0,
            availableBalance: BMS_INITIAL_BALANCE.toNumber(),
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
        },
    });

    let totalRealized = 0;
    let totalEstimatedInProgress = 0;

    for (const report of reports) {
        const hasBmsWork = hasBmsRepairItems(report.items);
        if (!hasBmsWork) continue;

        if (report.status === "COMPLETED") {
            // Gunakan realisasi aktual jika sudah selesai
            const real = report.totalReal
                ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
                : new Prisma.Decimal(report.totalEstimation.toString()).toNumber();
            totalRealized += real;
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
    const availableBalance = Math.max(
        0,
        initialBalance - totalRealized - totalEstimatedInProgress,
    );

    return {
        periodId: period.id,
        periodStatus: period.status as BmsBalanceInfo["periodStatus"],
        initialBalance,
        totalEstimated: totalEstimatedInProgress,
        totalRealized,
        availableBalance,
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
export async function resetBmsBalanceAfterPjumApproval(
    bmsNIK: string,
    pjumExportId: string,
) {
    const period = await getBmsActivePeriod(bmsNIK);

    return prisma.$transaction(async (tx) => {
        if (period) {
            await tx.bmsBalancePeriod.update({
                where: { id: period.id },
                data: {
                    status: "CLOSED",
                    closedAt: new Date(),
                },
            });
        }

        return tx.bmsBalancePeriod.create({
            data: {
                bmsNIK,
                initialBalance: BMS_INITIAL_BALANCE,
                status: "ACTIVE",
                pjumExportId,
            },
        });
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
