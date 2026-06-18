import "server-only";

/**
 * Prisma connection error codes:
 * P1001 = Can't reach database server
 * P1002 = Database server timed out
 * P1008 = Operations timed out
 * P1017 = Server has closed the connection
 * P2037 = Too many database connections opened
 */
const CONNECTION_ERROR_CODES = ["P1001", "P1002", "P1008", "P1017", "P2037"];

const CONNECTION_ERROR_PATTERNS = [
    "too many database connections",
    "remaining connection slots are reserved",
    "can't reach database server",
    "server has closed the connection",
];

/**
 * Mengecek apakah error dari Prisma adalah error koneksi/jaringan
 */
export function isConnectionError(error: unknown): boolean {
    if (error && typeof error === "object" && "code" in error) {
        return CONNECTION_ERROR_CODES.includes(
            (error as { code: string }).code,
        );
    }

    const message =
        error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "";

    if (message) {
        const normalizedMessage = message.toLowerCase();
        return CONNECTION_ERROR_PATTERNS.some((pattern) =>
            normalizedMessage.includes(pattern),
        );
    }

    return false;
}

/**
 * Mengembalikan pesan user-friendly berdasarkan tipe error
 */
export function getDbErrorMessage(error: unknown): string {
    if (isConnectionError(error)) {
        return "Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda dan coba lagi.";
    }
    return "Terjadi kesalahan pada server. Silakan coba lagi.";
}
