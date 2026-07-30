export type PreventiveQuarterKey = "q1" | "q2" | "q3" | "q4";

export type PreventiveCompletion = "all" | "completed" | "pending";

type QuarterRow = Partial<Record<PreventiveQuarterKey, unknown>>;

export function splitPreventiveRows<T extends QuarterRow>(
    rows: T[],
    quarterKey: PreventiveQuarterKey,
) {
    const completed: T[] = [];
    const pending: T[] = [];

    for (const row of rows) {
        (row[quarterKey] ? completed : pending).push(row);
    }

    return { completed, pending };
}

export function paginatePreventiveRows<T extends { storeCode: string }>(
    rows: T[],
    cursor: string | null,
    limit: number,
) {
    const cursorIndex = cursor
        ? rows.findIndex((row) => row.storeCode === cursor)
        : -1;
    const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const page = rows.slice(startIndex, startIndex + limit);

    return {
        rows: page,
        nextCursor:
            startIndex + limit < rows.length
                ? page.at(-1)?.storeCode ?? null
                : null,
    };
}

export function summarizePreventiveBranches<
    T extends { branchName: string } & QuarterRow,
>(rows: T[], quarterKey: PreventiveQuarterKey) {
    const branches = new Map<
        string,
        { branchName: string; totalStores: number; completed: number; pending: number }
    >();

    for (const row of rows) {
        const branch = branches.get(row.branchName) ?? {
            branchName: row.branchName,
            totalStores: 0,
            completed: 0,
            pending: 0,
        };

        branch.totalStores += 1;
        if (row[quarterKey]) branch.completed += 1;
        else branch.pending += 1;
        branches.set(row.branchName, branch);
    }

    return Array.from(branches.values()).sort((a, b) =>
        a.branchName.localeCompare(b.branchName, "id-ID"),
    );
}

export function getPreventiveCompletionForTab(tab: string): PreventiveCompletion {
    if (tab === "completed") return "completed";
    if (tab === "pending") return "pending";
    return "all";
}
