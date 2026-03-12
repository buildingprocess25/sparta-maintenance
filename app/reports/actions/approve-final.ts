"use server";

/**
 * @deprecated APPROVED_BMC status has been removed. BMC approval now directly
 * sets status to COMPLETED via review-completion.ts. This stub exists only to
 * prevent import errors while the import is being cleaned up.
 */
export async function approveFinal(
    _reportNumber: string,
    _notes?: string,
): Promise<{ error: string }> {
    return { error: "Fitur persetujuan final sudah tidak tersedia" };
}
