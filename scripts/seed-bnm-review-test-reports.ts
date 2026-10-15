/**
 * Data uji: buat 2 laporan berstatus Review BNM (APPROVED_BMC) dengan waktu
 * masuk yang dimanipulasi untuk menguji tampilan tenggat BNM:
 *   - AMAN        : masuk 2 jam lalu (belum lewat 24 jam)
 *   - LEWAT BATAS : masuk cukup lama sehingga tenggat 23:59 WIB sudah terlewat
 *
 * Laporan dikloning dari laporan template (data BMS/toko/item yang sama),
 * dengan balancePeriodId = null agar tidak memotong saldo BMS uji. Semua
 * ApprovalLog/ActivityLog yang dibuat diberi penanda TEST_MARKER sehingga
 * cleanup hanya menghapus data buatan skrip ini.
 *
 * Catatan: laporan LEWAT BATAS membuat BMS pemilik laporan terblokir
 * membuat laporan baru sampai BNM memprosesnya atau data dibersihkan.
 *
 * Pakai:
 *   npx tsx scripts/seed-bnm-review-test-reports.ts            # dry-run
 *   npx tsx scripts/seed-bnm-review-test-reports.ts --apply    # buat data
 *   npx tsx scripts/seed-bnm-review-test-reports.ts --cleanup  # hapus data uji
 *   Opsi: --template=AHO8-2610-002
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import {
    BNM_REVIEW_DEFAULT_SLA_DAYS,
    formatBnmReviewDeadline,
    getBnmReviewDeadline,
    getBnmReviewState,
    type BnmReviewState,
} from "../lib/bnm-review-deadline";

const TEST_MARKER = "[TEST-BNM-REVIEW]";
const MS_PER_HOUR = 3_600_000;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const cleanup = args.includes("--cleanup");
const templateReportNumber =
    args.find((arg) => arg.startsWith("--template="))?.split("=")[1] ??
    "AHO8-2610-002";

const fmt = (date: Date) =>
    date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

async function getSlaDays() {
    const setting = await prisma.appSetting.findUnique({
        where: { key: "report_sla_approved_bmc_days" },
    });
    const parsed = Number.parseInt(setting?.value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0
        ? parsed
        : BNM_REVIEW_DEFAULT_SLA_DAYS;
}

async function runCleanup() {
    const logs = await prisma.approvalLog.findMany({
        where: { notes: { startsWith: TEST_MARKER } },
        select: { reportNumber: true },
        distinct: ["reportNumber"],
    });
    const reportNumbers = logs.map((log) => log.reportNumber);
    console.log("Laporan uji ditemukan:", reportNumbers);
    if (reportNumbers.length === 0) return;

    await prisma.$transaction([
        prisma.activityLog.deleteMany({
            where: { reportNumber: { in: reportNumbers } },
        }),
        prisma.approvalLog.deleteMany({
            where: { reportNumber: { in: reportNumbers } },
        }),
        prisma.report.deleteMany({
            where: { reportNumber: { in: reportNumbers } },
        }),
    ]);
    console.log(`Dihapus: ${reportNumbers.length} laporan uji beserta log-nya.`);
}

async function nextReportNumbers(templateNumber: string, count: number) {
    const prefix = templateNumber.slice(0, templateNumber.lastIndexOf("-") + 1);
    const latest = await prisma.report.findFirst({
        where: { reportNumber: { startsWith: prefix } },
        orderBy: { reportNumber: "desc" },
        select: { reportNumber: true },
    });
    const maxSeq = latest
        ? Number.parseInt(latest.reportNumber.slice(prefix.length), 10) || 0
        : 0;

    return Array.from(
        { length: count },
        (_, index) => `${prefix}${String(maxSeq + index + 1).padStart(3, "0")}`,
    );
}

async function main() {
    console.log("DB host:", new URL(process.env.DATABASE_URL!).host);

    if (cleanup) {
        await runCleanup();
        return;
    }

    const template = await prisma.report.findUnique({
        where: { reportNumber: templateReportNumber },
    });
    if (!template) throw new Error(`Template ${templateReportNumber} tidak ada`);

    const templateLog = await prisma.approvalLog.findFirst({
        where: { reportNumber: templateReportNumber, status: "APPROVED_BMC" },
        orderBy: { createdAt: "desc" },
        select: { approverNIK: true },
    });
    if (!templateLog) {
        throw new Error(
            `Template ${templateReportNumber} tidak punya ApprovalLog APPROVED_BMC`,
        );
    }

    const existing = await prisma.approvalLog.count({
        where: { notes: { startsWith: TEST_MARKER } },
    });
    if (existing > 0) {
        throw new Error(
            "Data uji sebelumnya masih ada. Jalankan --cleanup dulu.",
        );
    }

    const slaDays = await getSlaDays();
    const now = Date.now();
    const scenarios: { label: string; hoursAgo: number; expected: BnmReviewState }[] = [
        { label: "AMAN", hoursAgo: 2, expected: "ON_TIME" },
        {
            label: "LEWAT BATAS",
            hoursAgo: (slaDays + 1) * 24 + 1,
            expected: "OVERDUE",
        },
    ];
    const reportNumbers = await nextReportNumbers(
        templateReportNumber,
        scenarios.length,
    );

    console.log(`Template: ${templateReportNumber} (BMS ${template.createdByNIK}, ${template.branchName})`);
    console.log(`slaDays: ${slaDays}`);

    const plan = scenarios.map((scenario, index) => {
        const enteredAt = new Date(now - scenario.hoursAgo * MS_PER_HOUR);
        const state = getBnmReviewState({ enteredAt, slaDays });
        if (state !== scenario.expected) {
            throw new Error(
                `Skenario ${scenario.label} menghasilkan ${state}, seharusnya ${scenario.expected}`,
            );
        }
        return { ...scenario, reportNumber: reportNumbers[index], enteredAt, state };
    });

    for (const item of plan) {
        console.log(
            `- ${item.reportNumber} [${item.label}] masuk ${fmt(item.enteredAt)} | batas ${formatBnmReviewDeadline(getBnmReviewDeadline(item.enteredAt, slaDays))} | state ${item.state}`,
        );
    }

    if (!apply) {
        console.log("\nDry-run. Tambahkan --apply untuk membuat data.");
        return;
    }

    for (const item of plan) {
        await prisma.$transaction([
            prisma.report.create({
                data: {
                    reportNumber: item.reportNumber,
                    branchName: template.branchName,
                    areaName: template.areaName,
                    storeName: template.storeName,
                    storeCode: template.storeCode,
                    status: "APPROVED_BMC",
                    totalEstimation: template.totalEstimation,
                    totalReal: template.totalReal,
                    createdByNIK: template.createdByNIK,
                    items: template.items as Prisma.InputJsonValue,
                    estimations: template.estimations as Prisma.InputJsonValue,
                    startSelfieUrl: template.startSelfieUrl,
                    startReceiptUrls: template.startReceiptUrls as Prisma.InputJsonValue,
                    startMaterialStores: template.startMaterialStores as Prisma.InputJsonValue,
                    completionNotes: template.completionNotes,
                    completionAdditionalPhotos:
                        template.completionAdditionalPhotos as Prisma.InputJsonValue,
                    completionAdditionalNote: template.completionAdditionalNote,
                    unexpectedCostNotes: template.unexpectedCostNotes,
                    balancePeriodId: null,
                    createdAt: new Date(item.enteredAt.getTime() - 24 * MS_PER_HOUR),
                },
            }),
            prisma.approvalLog.create({
                data: {
                    reportNumber: item.reportNumber,
                    approverNIK: templateLog.approverNIK,
                    status: "APPROVED_BMC",
                    notes: `${TEST_MARKER} ${item.label}`,
                    createdAt: item.enteredAt,
                },
            }),
            prisma.activityLog.create({
                data: {
                    reportNumber: item.reportNumber,
                    actorNIK: templateLog.approverNIK,
                    action: "WORK_APPROVED",
                    notes: `${TEST_MARKER} ${item.label}`,
                    createdAt: item.enteredAt,
                },
            }),
        ]);
        console.log(`Dibuat: ${item.reportNumber} [${item.label}]`);
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
