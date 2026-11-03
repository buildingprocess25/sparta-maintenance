import type { Prisma } from "@prisma/client";

export const BMS_DELETED_ASSIGNMENT_NOTE = "User BMS dihapus";

/**
 * Nonaktifkan semua penugasan toko aktif milik BMS (toko jadi vacant).
 * Dipanggil di dalam transaksi hapus user agar keduanya atomik.
 */
export function vacateBmsAssignments(
    db: Prisma.TransactionClient,
    bmsNIK: string,
    actorNIK: string,
) {
    return db.bmsStoreAssignment.updateMany({
        where: { bmsNIK, isActive: true },
        data: {
            isActive: false,
            unassignedAt: new Date(),
            unassignedByNIK: actorNIK,
            notes: BMS_DELETED_ASSIGNMENT_NOTE,
        },
    });
}
