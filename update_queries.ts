import * as fs from 'fs';

let content = fs.readFileSync('app/dashboard/queries.ts', 'utf-8');

// 1. Add import
if (!content.includes('StoreBrandFilter')) {
    content = content.replace(
        'import { requiresPjum } from "@/lib/realisasi";',
        `import { requiresPjum } from "@/lib/realisasi";\nimport { StoreBrandFilter, getReportBrandWhere } from "@/lib/store-brand-filter";`
    );
}

// 2. Update AdminCommandCenterData type
if (!content.includes('brandBreakdown?:')) {
    content = content.replace(
        'export type AdminCommandCenterData = {',
        `export type AdminCommandCenterDataBreakdown = {
    kpi: AdminKpiMetric;
    status: AdminStatusDatum[];
    trends: AdminTrendDatum[];
    branches: AdminBranchPerformanceDatum[];
    stuckReports: AdminAttentionReport[];
    pjum: AdminPjumSummary;
};

export type AdminCommandCenterData = {`
    );
    
    content = content.replace(
        'recentActivity: ActivityItem[];\n};',
        `recentActivity: ActivityItem[];
    brandBreakdown?: {
        ALFAMART: AdminCommandCenterDataBreakdown;
        LAWSON: AdminCommandCenterDataBreakdown;
    };
};`
    );
}

// 3. Update getAdminStatusDistribution
content = content.replace(
    'async function getAdminStatusDistribution(\n    window: { start: Date; end?: Date },\n    slaDaysByStatus: Partial<Record<string, number>>,\n): Promise<AdminStatusDatum[]> {',
    'async function getAdminStatusDistribution(\n    window: { start: Date; end?: Date },\n    slaDaysByStatus: Partial<Record<string, number>>,\n    brand: StoreBrandFilter = "ALL"\n): Promise<AdminStatusDatum[]> {\n    const brandWhere = getReportBrandWhere(brand);'
);
content = content.replace(
    '        where: {\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            status: {',
    '        where: {\n            ...brandWhere,\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            status: {'
);
content = content.replace(
    '                where: {\n                    NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n                    status: status as never,',
    '                where: {\n                    ...brandWhere,\n                    NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n                    status: status as never,'
);

// 4. Update getAdminPjumSummary
content = content.replace(
    'async function getAdminPjumSummary(window: { start: Date; end?: Date }): Promise<AdminPjumSummary> {',
    'async function getAdminPjumSummary(window: { start: Date; end?: Date }, brand: StoreBrandFilter = "ALL"): Promise<AdminPjumSummary> {\n    let pjumWhere: Prisma.PjumExportWhereInput = {\n        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n        createdAt: {\n            gte: window.start,\n            ...(window.end ? { lt: window.end } : {})\n        },\n    };\n\n    if (brand !== "ALL") {\n        const brandReports = await prisma.report.findMany({\n            where: getReportBrandWhere(brand),\n            select: { reportNumber: true }\n        });\n        pjumWhere.reportNumbers = { hasSome: brandReports.map(r => r.reportNumber) };\n    }'
);
content = content.replace(
    '        where: {\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            createdAt: { \n                gte: window.start,\n                ...(window.end ? { lt: window.end } : {})\n            },\n        },',
    '        where: pjumWhere,'
);

// 5. Update getAdminKpiMetric
content = content.replace(
    'async function getAdminKpiMetric(\n    window: { start: Date; end?: Date },\n    activeUsers: number,\n    pendingPjum: number,\n): Promise<AdminKpiMetric> {\n    const baseWhere = {\n        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },',
    'async function getAdminKpiMetric(\n    window: { start: Date; end?: Date },\n    activeUsers: number,\n    pendingPjum: number,\n    brand: StoreBrandFilter = "ALL"\n): Promise<AdminKpiMetric> {\n    const brandWhere = getReportBrandWhere(brand);\n    const baseWhere = {\n        ...brandWhere,\n        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },'
);
content = content.replace(
    '    const completedWhere = {\n        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },',
    '    const completedWhere = {\n        ...brandWhere,\n        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },'
);

// 6. Update getAdminBranchPerformance
content = content.replace(
    'async function getAdminBranchPerformance(\n    window: { start: Date; end?: Date },\n    hierarchy: AdminBranchHierarchy,\n): Promise<AdminBranchPerformanceDatum[]> {\n',
    'async function getAdminBranchPerformance(\n    window: { start: Date; end?: Date },\n    hierarchy: AdminBranchHierarchy,\n    brand: StoreBrandFilter = "ALL"\n): Promise<AdminBranchPerformanceDatum[]> {\n    const brandWhere = getReportBrandWhere(brand);\n'
);
content = content.replace(
    '            where: {\n                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n                status: {',
    '            where: {\n                ...brandWhere,\n                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n                status: {'
);
content = content.replace(
    '            where: {\n                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n                status: "COMPLETED",',
    '            where: {\n                ...brandWhere,\n                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n                status: "COMPLETED",'
);

// 7. Update getAdminBranchTrend
content = content.replace(
    'async function getAdminBranchTrend(\n    period: AdminTrendPeriod,\n    hierarchy: AdminBranchHierarchy,\n): Promise<AdminTrendDatum[]> {\n    const trendWindow = getTrendWindow(period);',
    'async function getAdminBranchTrend(\n    period: AdminTrendPeriod,\n    hierarchy: AdminBranchHierarchy,\n    brand: StoreBrandFilter = "ALL"\n): Promise<AdminTrendDatum[]> {\n    const trendWindow = getTrendWindow(period);\n    const brandWhere = getReportBrandWhere(brand);'
);
content = content.replace(
    '        where: {\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            status: "COMPLETED",',
    '        where: {\n            ...brandWhere,\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            status: "COMPLETED",'
);

// 8. Update getAdminStuckReports
content = content.replace(
    'async function getAdminStuckReports(\n    slaDaysByStatus: Partial<Record<string, number>>,\n): Promise<AdminAttentionReport[]> {',
    'async function getAdminStuckReports(\n    slaDaysByStatus: Partial<Record<string, number>>,\n    brand: StoreBrandFilter = "ALL"\n): Promise<AdminAttentionReport[]> {\n    const brandWhere = getReportBrandWhere(brand);'
);
content = content.replace(
    '        where: {\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            OR: slaEntries.map(([status, days]) => {',
    '        where: {\n            ...brandWhere,\n            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },\n            OR: slaEntries.map(([status, days]) => {'
);

// 9. Update getAdminCommandCenterData
const oldGetAdmin = `export async function getAdminCommandCenterData(
    period: AdminTrendPeriod = "ytd",
): Promise<AdminCommandCenterData> {
    const trendWindow = getTrendWindow(period);
    const empty = getEmptyAdminCommandCenterData();

    try {
        const slaDaysByStatus = await getReportSlaDays();
        const [activeUsers, hierarchy, status, pjum, recentActivity] =
            await Promise.all([
            getAdminVisibleTodayActiveUserCount(),
            getAdminBranchHierarchy(),
            getAdminStatusDistribution(trendWindow, slaDaysByStatus),
            getAdminPjumSummary(trendWindow),
            getGlobalActivity(8),
        ]);

        const [kpi, branches, trends, stuckReports] =
            await Promise.all([
            getAdminKpiMetric(trendWindow, activeUsers, pjum.pending),
            getAdminBranchPerformance(trendWindow, hierarchy),
            getAdminBranchTrend(period, hierarchy),
            getAdminStuckReports(slaDaysByStatus),
        ]);

        return {
            kpi,
            status,
            trends,
            branchOptions: hierarchy.options,
            branches,
            stuckReports,
            pjum,
            recentActivity,
        };
    } catch (error) {
        logger.error(
            { operation: "getAdminCommandCenterData" },
            "Failed",
            error,
        );
        return empty;
    }
}`;

const newGetAdmin = `async function getAdminCommandCenterDataForBrand(
    period: AdminTrendPeriod,
    hierarchy: AdminBranchHierarchy,
    activeUsers: number,
    slaDaysByStatus: Partial<Record<string, number>>,
    brand: StoreBrandFilter,
): Promise<AdminCommandCenterDataBreakdown> {
    const trendWindow = getTrendWindow(period);
    const [status, pjum] = await Promise.all([
        getAdminStatusDistribution(trendWindow, slaDaysByStatus, brand),
        getAdminPjumSummary(trendWindow, brand),
    ]);

    const [kpi, branches, trends, stuckReports] = await Promise.all([
        getAdminKpiMetric(trendWindow, activeUsers, pjum.pending, brand),
        getAdminBranchPerformance(trendWindow, hierarchy, brand),
        getAdminBranchTrend(period, hierarchy, brand),
        getAdminStuckReports(slaDaysByStatus, brand),
    ]);

    return {
        kpi,
        status,
        trends,
        branches,
        stuckReports,
        pjum,
    };
}

export async function getAdminCommandCenterData(
    period: AdminTrendPeriod = "ytd",
    brand: StoreBrandFilter = "ALL",
): Promise<AdminCommandCenterData> {
    const empty = getEmptyAdminCommandCenterData();

    try {
        const slaDaysByStatus = await getReportSlaDays();
        const [activeUsers, hierarchy, recentActivity] = await Promise.all([
            getAdminVisibleTodayActiveUserCount(),
            getAdminBranchHierarchy(),
            getGlobalActivity(8),
        ]);

        const mainData = await getAdminCommandCenterDataForBrand(
            period,
            hierarchy,
            activeUsers,
            slaDaysByStatus,
            brand
        );

        let brandBreakdown = undefined;
        if (brand === "ALL") {
            const [alfamartData, lawsonData] = await Promise.all([
                getAdminCommandCenterDataForBrand(period, hierarchy, activeUsers, slaDaysByStatus, "ALFAMART"),
                getAdminCommandCenterDataForBrand(period, hierarchy, activeUsers, slaDaysByStatus, "LAWSON"),
            ]);
            brandBreakdown = {
                ALFAMART: alfamartData,
                LAWSON: lawsonData,
            };
        }

        return {
            ...mainData,
            branchOptions: hierarchy.options,
            recentActivity,
            brandBreakdown,
        };
    } catch (error) {
        logger.error(
            { operation: "getAdminCommandCenterData", brand },
            "Failed",
            error,
        );
        return empty;
    }
}`;

content = content.replace(oldGetAdmin, newGetAdmin);

fs.writeFileSync('app/dashboard/queries.ts', content, 'utf-8');
console.log("Done updating queries.ts");
