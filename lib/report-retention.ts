type RelatedPjum = {
    id: string;
    status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    reportNumbers: string[];
};

export class ReportRetentionConflictError extends Error {
    constructor() {
        super("Data laporan atau PJUM berubah. Muat ulang halaman dan coba lagi");
        this.name = "ReportRetentionConflictError";
    }
}

export function assertRetentionMutationApplied(count: number): void {
    if (count !== 1) throw new ReportRetentionConflictError();
}

export function isDeleteConfirmationValid(
    reportNumber: string,
    confirmation: string,
): boolean {
    return confirmation === reportNumber;
}

export function resolvePjumDetachments(
    reportNumber: string,
    pjums: RelatedPjum[],
):
    | { ok: false; error: string }
    | {
          ok: true;
          deleteIds: string[];
          updates: Array<{ id: string; reportNumbers: string[] }>;
      } {
    if (pjums.some((pjum) => pjum.status === "APPROVED")) {
        return {
            ok: false,
            error: "Laporan terikat PJUM yang sudah disetujui",
        };
    }

    const deleteIds: string[] = [];
    const updates: Array<{ id: string; reportNumbers: string[] }> = [];

    for (const pjum of pjums) {
        const reportNumbers = pjum.reportNumbers.filter(
            (item) => item !== reportNumber,
        );

        if (reportNumbers.length === 0) {
            deleteIds.push(pjum.id);
        } else {
            updates.push({ id: pjum.id, reportNumbers });
        }
    }

    return { ok: true, deleteIds, updates };
}
