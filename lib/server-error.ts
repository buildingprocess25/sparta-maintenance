import "server-only";

/**
 * Map of known Prisma error codes to safe, user-facing messages.
 * Full list: https://www.prisma.io/docs/orm/reference/error-reference
 */
const PRISMA_SAFE_MESSAGES: Record<string, string> = {
    P2002: "Data sudah ada (duplikasi)",
    P2003: "Data terkait tidak ditemukan",
    P2025: "Data tidak ditemukan atau sudah dihapus",
};

/**
 * Extract a client-safe error detail from any thrown value.
 *
 * Internal details (Prisma query errors, stack traces, schema info)
 * are NEVER exposed. Known error codes are mapped to friendly messages;
 * unknown errors return a generic fallback. The raw error is still
 * logged server-side via the logger before this function is called.
 */
export function getErrorDetail(error: unknown): string {
    // Handle Prisma client errors (PrismaClientKnownRequestError)
    if (
        error instanceof Error &&
        "code" in error &&
        typeof (error as Record<string, unknown>).code === "string"
    ) {
        const code = (error as Record<string, unknown>).code as string;
        const safeMessage = PRISMA_SAFE_MESSAGES[code];
        if (safeMessage) {
            return safeMessage;
        }
        // Known Prisma error but no mapped message — return generic
        if (code.startsWith("P")) {
            return "Terjadi kesalahan pada database";
        }
    }

    // Never expose raw Error.message — it may contain SQL, table names, etc.
    return "Terjadi kesalahan internal";
}
