export type StoreAreaRow = {
    branchName: string;
    areaName: string | null;
};

export type AreaNamesByBranch = Record<string, string[]>;

function normalizeAreaName(areaName: string | null | undefined) {
    const value = areaName?.trim();
    return value || null;
}

export function groupAreaNamesByBranch(
    branchNames: string[],
    rows: StoreAreaRow[],
): AreaNamesByBranch {
    const allowedBranches = new Set(branchNames);
    const grouped = new Map(
        branchNames.map((branchName) => [branchName, new Set<string>()]),
    );

    for (const row of rows) {
        const areaName = normalizeAreaName(row.areaName);
        if (!areaName || !allowedBranches.has(row.branchName)) continue;
        grouped.get(row.branchName)?.add(areaName);
    }

    return Object.fromEntries(
        branchNames.map((branchName) => [
            branchName,
            Array.from(grouped.get(branchName) ?? []).sort((a, b) =>
                a.localeCompare(b, "id"),
            ),
        ]),
    );
}

export function getStoreAreaOptions(
    areaNamesByBranch: AreaNamesByBranch,
    branchName: string,
    currentAreaName?: string | null,
) {
    const current = normalizeAreaName(currentAreaName);
    return Array.from(
        new Set([
            ...(areaNamesByBranch[branchName] ?? []),
            ...(current ? [current] : []),
        ]),
    ).sort((a, b) => a.localeCompare(b, "id"));
}

export { normalizeAreaName };
