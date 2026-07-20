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
    const { role, requestedSheets, selectedBranches, assignedBranches } = input;
    const requestedSheet =
        requestedSheets.length === 1 ? requestedSheets[0] : undefined;
    const isAllowedSheet =
        requestedSheet === "reports" ||
        requestedSheet === "pjum" ||
        (role === "BMC" && requestedSheet === "preventive");

    if (!isAllowedSheet) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    const branchNames =
        selectedBranches.length > 0
            ? selectedBranches
            : assignedBranches.filter((branchName) => branchName.trim());
    const hasUnauthorizedBranch = branchNames.some(
        (branchName) => !assignedBranches.includes(branchName),
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
