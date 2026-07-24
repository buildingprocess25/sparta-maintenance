export type LimitedExportRole = "BMC" | "BNM_MANAGER";

export type ExportSheet =
    | "reports"
    | "materials"
    | "pjum"
    | "preventive";

type LimitedExportScopeResult =
    | { ok: true; branchNames: string[] }
    | { ok: false; status: 400 | 403; error: string };

export function resolveLimitedExportScope(input: {
    role: LimitedExportRole;
    requestedSheets: ExportSheet[];
    selectedBranches: string[];
    assignedBranches: string[];
}): LimitedExportScopeResult {
    const { requestedSheets, selectedBranches, assignedBranches } = input;
    const requestedSheet =
        requestedSheets.length === 1 ? requestedSheets[0] : undefined;
    const isAllowedSheet =
        requestedSheet === "reports" ||
        requestedSheet === "pjum" ||
        requestedSheet === "preventive";

    if (!isAllowedSheet) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    const normalizedSelectedBranches = selectedBranches
        .map((branchName) => branchName.trim())
        .filter(Boolean);
    const normalizedAssignedBranches = assignedBranches
        .map((branchName) => branchName.trim())
        .filter(Boolean);
    const branchNames =
        selectedBranches.length > 0
            ? normalizedSelectedBranches
            : normalizedAssignedBranches;

    if (
        branchNames.length === 0 ||
        branchNames.some(
            (branchName) =>
                branchName === "all" || branchName === "HEAD OFFICE",
        )
    ) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    const hasUnauthorizedBranch = branchNames.some(
        (branchName) => !normalizedAssignedBranches.includes(branchName),
    );

    if (hasUnauthorizedBranch) {
        return {
            ok: false,
            status: 403,
            error: "Anda tidak punya akses ke cabang ini",
        };
    }

    return { ok: true, branchNames };
}

export function resolveBranchFilterScope(
    selectedBranches: string[],
    mode: "admin-hierarchy" | "exact",
    parentMap: Map<string, string>
) {
    if (mode === "exact") {
        return selectedBranches.filter(b => b !== "HEAD OFFICE");
    }

    const resolved = new Set(selectedBranches);

    for (const [branch, parent] of parentMap.entries()) {
        if (selectedBranches.includes(parent)) {
            resolved.add(branch);
        }
    }

    resolved.delete("HEAD OFFICE");
    return Array.from(resolved);
}
