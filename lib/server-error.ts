import "server-only";

/**
 * Safely extract a human-readable message from any thrown value.
 * Used in server actions to include actual error reason in the response
 * so users can report it to developers.
 */
export function getErrorDetail(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "Unknown error";
}
