export const LEGACY_BRANCH_MERGES = new Map<string, string>([
    ["BOGOR", "CILEUNGSI RAYA"],
    ["BEKASI", "CILEUNGSI RAYA"],
    ["KARAWANG", "CILEUNGSI RAYA"],
    ["CILEUNGSI 2", "CILEUNGSI RAYA"],
    ["BALARAJA", "CIKOKOL RAYA"],
    ["SERANG", "CIKOKOL RAYA"],
    ["PARUNG", "CIKOKOL RAYA"],
    ["CIKOKOL", "CIKOKOL RAYA"],
]);

function normalizeBranchName(branchName: string) {
    return branchName.trim();
}

export function getCanonicalBranchName(branchName: string) {
    const normalized = normalizeBranchName(branchName);
    return LEGACY_BRANCH_MERGES.get(normalized) ?? normalized;
}

export function getLegacyBranchMessage(branchName: string) {
    const normalized = normalizeBranchName(branchName);
    const canonical = LEGACY_BRANCH_MERGES.get(normalized);
    if (!canonical) return null;

    return `Cabang ${normalized} sudah digabung ke ${canonical}. Pilih ${canonical}, lalu isi Cabang Lama.`;
}

export function getWritableBranchNames(branchNames: string[]) {
    return [
        ...new Set(
            branchNames
                .map(normalizeBranchName)
                .filter((branchName) => branchName.length > 0)
                .filter((branchName) => !LEGACY_BRANCH_MERGES.has(branchName)),
        ),
    ];
}
