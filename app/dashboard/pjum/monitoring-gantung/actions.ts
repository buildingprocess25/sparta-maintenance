"use server";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BucketReport = {
    reportNumber: string;
    total: number;
    createdAt: string; // ISO string — enables client-side month filtering
};

export const BUCKET_KEYS = ['0-7 Hari', '8-14 Hari', '15-21 Hari', '22-28 Hari', '>28 Hari'] as const;
export type BucketKey = typeof BUCKET_KEYS[number];

export type HangingDataRow = {
    nik: string;
    name: string;
    branch: string;
    latestPjumDate: string | null;
    buckets: Record<BucketKey, BucketReport[]>;
};

export type MonitoringGantungResult = {
    bmcBelum: HangingDataRow[];
    bnmBelum: HangingDataRow[];
    gantungReal: HangingDataRow[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getYtdStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
}

function getBucket(date: Date): BucketKey {
    const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) return '0-7 Hari';
    if (diff <= 14) return '8-14 Hari';
    if (diff <= 21) return '15-21 Hari';
    if (diff <= 28) return '22-28 Hari';
    return '>28 Hari';
}

function createEmptyBuckets(): Record<BucketKey, BucketReport[]> {
    return {
        '0-7 Hari': [],
        '8-14 Hari': [],
        '15-21 Hari': [],
        '22-28 Hari': [],
        '>28 Hari': [],
    };
}

// ─── Cached Core Query ─────────────────────────────────────────────────────

const fetchMonitoringGantungData = unstable_cache(
    async (includeEmpty: boolean): Promise<MonitoringGantungResult> => {
        const startDate = getYtdStart();
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // 1. Fetch all BMS users (excluding HEAD OFFICE)
        const bmsUsers = await prisma.user.findMany({
            where: { role: 'BMS' },
            select: { NIK: true, name: true, branchNames: true },
        });

        // 2. Batch fetch latest PJUM per BMS (avoids N+1)
        const allPjums = await prisma.pjumExport.groupBy({
            by: ['bmsNIK'],
            _max: { createdAt: true },
        });
        const latestPjumMap = new Map<string, Date>();
        for (const p of allPjums) {
            if (p._max.createdAt) latestPjumMap.set(p.bmsNIK, p._max.createdAt);
        }

        // 3. Build BMS lookup and initialize per-sheet Maps
        const bmsMap = new Map<string, { NIK: string; name: string; branchNames: string[]; latestPjum: { createdAt: Date } | null }>();
        const sheets = {
            bmcBelum: new Map<string, HangingDataRow>(),
            bnmBelum: new Map<string, HangingDataRow>(),
            gantungReal: new Map<string, HangingDataRow>(),
        };

        for (const bms of bmsUsers) {
            const branch = bms.branchNames?.[0] ?? "-";
            if (branch === "HEAD OFFICE" || bms.branchNames.includes("HEAD OFFICE")) continue;

            const latestPjumCreatedAt = latestPjumMap.get(bms.NIK);
            bmsMap.set(bms.NIK, {
                ...bms,
                latestPjum: latestPjumCreatedAt ? { createdAt: latestPjumCreatedAt } : null,
            });

            const baseRow: HangingDataRow = {
                nik: bms.NIK,
                name: bms.name,
                branch,
                latestPjumDate: latestPjumCreatedAt ? latestPjumCreatedAt.toISOString() : null,
                buckets: createEmptyBuckets(),
            };

            sheets.bmcBelum.set(bms.NIK, { ...baseRow, buckets: createEmptyBuckets() });
            sheets.bnmBelum.set(bms.NIK, { ...baseRow, buckets: createEmptyBuckets() });
            sheets.gantungReal.set(bms.NIK, { ...baseRow, buckets: createEmptyBuckets() });
        }

        // 4. Optimized query: only fetch reports that are actually "hanging"
        const reports = await prisma.report.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                OR: [
                    { status: 'PENDING_REVIEW' },
                    { status: 'APPROVED_BMC' },
                    { status: 'COMPLETED', pjumExportedAt: null },
                ],
            },
            include: {
                createdBy: { select: { NIK: true, name: true, branchNames: true } },
            },
        });

        // 5. Categorize each report into the correct sheet + bucket
        for (const report of reports) {
            const total = Number(report.totalReal) || 0;
            if (total === 0) continue;

            const reportBranch = report.branchName || "-";
            if (reportBranch === "HEAD OFFICE") continue;

            const bmsInfo = bmsMap.get(report.createdBy.NIK);
            if (!bmsInfo) continue;

            const latestPjum = bmsInfo.latestPjum;
            let targetSheetName: keyof typeof sheets | null = null;
            let baseDate: Date | null = null;

            if (report.status === 'PENDING_REVIEW') {
                targetSheetName = "bmcBelum";
                baseDate = report.updatedAt;
            } else if (report.status === 'APPROVED_BMC') {
                targetSheetName = "bnmBelum";
                baseDate = report.updatedAt;
            } else if (report.status === 'COMPLETED' && report.pjumExportedAt === null) {
                if (latestPjum && report.finishedAt && report.finishedAt < latestPjum.createdAt) {
                    targetSheetName = "gantungReal";
                    baseDate = report.finishedAt;
                }
            }

            if (targetSheetName && baseDate) {
                const targetSheet = sheets[targetSheetName];
                const row = targetSheet.get(bmsInfo.NIK);
                if (row) {
                    const bucket = getBucket(baseDate);
                    row.buckets[bucket].push({
                        reportNumber: report.reportNumber,
                        total,
                        createdAt: report.createdAt.toISOString(),
                    });
                }
            }
        }

        // 6. Finalize: optionally filter out BMS with zero reports
        const hasReports = (row: HangingDataRow) =>
            Object.values(row.buckets).some((b) => b.length > 0);

        return {
            bmcBelum: includeEmpty
                ? Array.from(sheets.bmcBelum.values())
                : Array.from(sheets.bmcBelum.values()).filter(hasReports),
            bnmBelum: includeEmpty
                ? Array.from(sheets.bnmBelum.values())
                : Array.from(sheets.bnmBelum.values()).filter(hasReports),
            gantungReal: includeEmpty
                ? Array.from(sheets.gantungReal.values())
                : Array.from(sheets.gantungReal.values()).filter(hasReports),
        };
    },
    ["monitoring-gantung-data"],
    { revalidate: 1800, tags: ["monitoring-gantung"] }
);

// ─── Server Action (public API) ────────────────────────────────────────────

export async function getMonitoringGantungData(
    includeEmpty: boolean = false,
): Promise<MonitoringGantungResult> {
    return fetchMonitoringGantungData(includeEmpty);
}
