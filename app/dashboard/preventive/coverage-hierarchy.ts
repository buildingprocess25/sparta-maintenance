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

export type UnassignedStoreItem = StoreCoverageHierarchyItem & {
    // Nama pembuat laporan preventif terbaru di kuartal
    doneByName?: string;
};

export type UnassignedCoverage = {
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    coverageRate: number;
    stores: UnassignedStoreItem[];
};

export type BranchCoverageHierarchy = {
    branchName: string;
    bmsCount: number;
    // Dihitung dari toko aktif unik di cabang (termasuk unassigned)
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    coverageRate: number;
    bmsList: BmsCoverageHierarchyItem[];
    // null jika semua toko cabang sudah ter-assign
    unassigned: UnassignedCoverage | null;
};

export type CoverageStoreInput = {
    code: string;
    name: string;
    branchName: string;
    assignments: { bmsNIK: string; bmsName: string | null }[];
};

export type CoverageReportInfo = {
    reportNumber: string;
    doneAt: string;
    doneByName: string;
};

function toRate(completed: number, total: number): number {
    return total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
}

export function buildCoverageHierarchy(
    stores: CoverageStoreInput[],
    reportByStore: Map<string, CoverageReportInfo>,
): BranchCoverageHierarchy[] {
    type BmsAccumulator = {
        nik: string;
        name: string;
        stores: StoreCoverageHierarchyItem[];
    };
    type BranchAccumulator = {
        bmsMap: Map<string, BmsAccumulator>;
        totalStores: number;
        completedStores: number;
        unassignedStores: UnassignedStoreItem[];
    };

    const branchMap = new Map<string, BranchAccumulator>();

    for (const store of stores) {
        const branchName = store.branchName || "TANPA CABANG";
        let branch = branchMap.get(branchName);
        if (!branch) {
            branch = {
                bmsMap: new Map(),
                totalStores: 0,
                completedStores: 0,
                unassignedStores: [],
            };
            branchMap.set(branchName, branch);
        }

        const report = reportByStore.get(store.code);
        const item: StoreCoverageHierarchyItem = {
            storeCode: store.code,
            storeName: store.name,
            isCompleted: !!report,
            doneAt: report?.doneAt,
            reportNumber: report?.reportNumber,
        };

        // Total cabang dihitung per toko, bukan per assignment
        branch.totalStores += 1;
        if (report) branch.completedStores += 1;

        if (store.assignments.length === 0) {
            branch.unassignedStores.push({ ...item, doneByName: report?.doneByName });
            continue;
        }

        for (const assignment of store.assignments) {
            let bms = branch.bmsMap.get(assignment.bmsNIK);
            if (!bms) {
                bms = {
                    nik: assignment.bmsNIK,
                    name: assignment.bmsName || assignment.bmsNIK,
                    stores: [],
                };
                branch.bmsMap.set(assignment.bmsNIK, bms);
            }
            // Hindari duplikasi store per BMS
            if (!bms.stores.some((s) => s.storeCode === store.code)) {
                bms.stores.push(item);
            }
        }
    }

    const results: BranchCoverageHierarchy[] = [];

    for (const [branchName, branch] of branchMap.entries()) {
        const bmsList: BmsCoverageHierarchyItem[] = [];

        for (const bms of branch.bmsMap.values()) {
            bms.stores.sort((a, b) => a.storeName.localeCompare(b.storeName));
            const totalStores = bms.stores.length;
            const completedStores = bms.stores.filter((s) => s.isCompleted).length;

            bmsList.push({
                nik: bms.nik,
                name: bms.name,
                totalStores,
                completedStores,
                pendingStores: Math.max(0, totalStores - completedStores),
                kpiRate: toRate(completedStores, totalStores),
                stores: bms.stores,
            });
        }

        bmsList.sort((a, b) => a.name.localeCompare(b.name));

        let unassigned: UnassignedCoverage | null = null;
        if (branch.unassignedStores.length > 0) {
            branch.unassignedStores.sort((a, b) => a.storeName.localeCompare(b.storeName));
            const totalStores = branch.unassignedStores.length;
            const completedStores = branch.unassignedStores.filter((s) => s.isCompleted).length;
            unassigned = {
                totalStores,
                completedStores,
                pendingStores: Math.max(0, totalStores - completedStores),
                coverageRate: toRate(completedStores, totalStores),
                stores: branch.unassignedStores,
            };
        }

        results.push({
            branchName,
            bmsCount: bmsList.length,
            totalStores: branch.totalStores,
            completedStores: branch.completedStores,
            pendingStores: Math.max(0, branch.totalStores - branch.completedStores),
            coverageRate: toRate(branch.completedStores, branch.totalStores),
            bmsList,
            unassigned,
        });
    }

    results.sort((a, b) => a.branchName.localeCompare(b.branchName));

    return results;
}
