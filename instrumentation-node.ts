import { logger } from "@/lib/logger";

declare global {
    // Prevent duplicate process handlers during dev reloads.
    var __spartaGlobalErrorHooksInstalled: boolean | undefined;
}

function normalizeUnknownError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
}

export async function registerNodeErrorHooks() {
    if (typeof process === "undefined" || typeof process.on !== "function") {
        return;
    }

    if (globalThis.__spartaGlobalErrorHooksInstalled) {
        return;
    }

    process.on("unhandledRejection", (reason) => {
        logger.error(
            {
                operation: "runtime.unhandledRejection",
            },
            "Unhandled promise rejection",
            normalizeUnknownError(reason),
        );
    });

    process.on("uncaughtException", (error) => {
        logger.error(
            {
                operation: "runtime.uncaughtException",
            },
            "Uncaught exception",
            normalizeUnknownError(error),
        );
    });

    globalThis.__spartaGlobalErrorHooksInstalled = true;
}
