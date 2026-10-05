"use server";
import prisma from "@/lib/prisma";

export type HangingDataRow = {
    nik: string;
    name: string;
    branch: string;
    latestPjumDate: string | null;
    buckets: {
        '0-7 Hari': { reportNumber: string, total: number }[];
        '8-14 Hari': { reportNumber: string, total: number }[];
        '15-21 Hari': { reportNumber: string, total: number }[];
        '22-28 Hari': { reportNumber: string, total: number }[];
        '>28 Hari': { reportNumber: string, total: number }[];
    }
};

export type MonitoringGantungResult = {
    bmcBelum: HangingDataRow[];
    bnmBelum: HangingDataRow[];
    gantungReal: HangingDataRow[];
};

export async function getMonitoringGantungData(startDateStr: string, endDateStr: string, branchName?: string, includeEmpty: boolean = false): Promise<MonitoringGantungResult> {
    const cacheKey = `v3_${startDateStr}_${endDateStr}_${branchName || 'all'}_${includeEmpty}`;
    const globalAny = global as any;
    
    // Check Cache (1 Hour TTL)
    if (globalAny.monitoringGantungCache && globalAny.monitoringGantungCache.key === cacheKey) {
        const age = Date.now() - globalAny.monitoringGantungCache.timestamp;
        if (age < 60 * 60 * 1000) {
            console.log("Serving from cache...");
            return globalAny.monitoringGantungCache.data;
        }
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Set to end of day for the end date if it isn't already
    endDate.setHours(23, 59, 59, 999);

    const bmsUsers = await prisma.user.findMany({
        where: { role: 'BMS' },
        select: { NIK: true, name: true, branchNames: true }
    });

    const bmsMap = new Map();
    const sheets = {
        bmcBelum: new Map<string, HangingDataRow>(),
        bnmBelum: new Map<string, HangingDataRow>(),
        gantungReal: new Map<string, HangingDataRow>()
    };

    // Optimasi N+1: Ambil data PJUM terbaru untuk semua BMS sekaligus menggunakan groupBy
    const allPjums = await prisma.pjumExport.groupBy({
        by: ['bmsNIK'],
        _max: {
            createdAt: true
        }
    });
    const latestPjumMap = new Map<string, Date>();
    for (const p of allPjums) {
        if (p._max.createdAt) {
            latestPjumMap.set(p.bmsNIK, p._max.createdAt);
        }
    }

    for (const bms of bmsUsers) {
        const branch = bms.branchNames?.[0] ?? "-";
        if (branch === "HEAD OFFICE" || bms.branchNames.includes("HEAD OFFICE")) continue;
        if (branchName && branchName !== "all" && !bms.branchNames.includes(branchName)) continue;

        const latestPjumCreatedAt = latestPjumMap.get(bms.NIK);
        bmsMap.set(bms.NIK, { ...bms, latestPjum: latestPjumCreatedAt ? { createdAt: latestPjumCreatedAt } : null });

        const createBaseInfo = (): HangingDataRow => ({
            nik: bms.NIK,
            name: bms.name,
            branch: branch,
            latestPjumDate: latestPjumCreatedAt ? latestPjumCreatedAt.toISOString() : null,
            buckets: {
                '0-7 Hari': [],
                '8-14 Hari': [],
                '15-21 Hari': [],
                '22-28 Hari': [],
                '>28 Hari': []
            }
        });

        sheets.bmcBelum.set(bms.NIK, createBaseInfo());
        sheets.bnmBelum.set(bms.NIK, createBaseInfo());
        sheets.gantungReal.set(bms.NIK, createBaseInfo());
    }

    const reports = await prisma.report.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['PENDING_REVIEW', 'APPROVED_BMC', 'COMPLETED'] }
        },
        include: {
            createdBy: { select: { NIK: true, name: true, branchNames: true } }
        }
    });

    const getBucket = (date: Date) => {
        const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 7) return '0-7 Hari';
        if (diff <= 14) return '8-14 Hari';
        if (diff <= 21) return '15-21 Hari';
        if (diff <= 28) return '22-28 Hari';
        return '>28 Hari';
    };

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
            if (targetSheet.has(bmsInfo.NIK)) {
                const bucket = getBucket(baseDate);
                targetSheet.get(bmsInfo.NIK)!.buckets[bucket].push({
                    reportNumber: report.reportNumber,
                    total
                });
            }
        }
    }

    const hasReports = (row: HangingDataRow) => Object.values(row.buckets).some(b => b.length > 0);

    const result = {
        bmcBelum: includeEmpty ? Array.from(sheets.bmcBelum.values()) : Array.from(sheets.bmcBelum.values()).filter(hasReports),
        bnmBelum: includeEmpty ? Array.from(sheets.bnmBelum.values()) : Array.from(sheets.bnmBelum.values()).filter(hasReports),
        gantungReal: includeEmpty ? Array.from(sheets.gantungReal.values()) : Array.from(sheets.gantungReal.values()).filter(hasReports)
    };

    globalAny.monitoringGantungCache = {
        key: cacheKey,
        timestamp: Date.now(),
        data: result
    };

    return result;
}
