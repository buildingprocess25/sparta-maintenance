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

export async function preloadAppSettings() {
    try {
        const { default: prisma } = await import("@/lib/prisma");
        const { setSettingOverride } = await import("@/lib/app-settings");

        const settings = await prisma.appSetting.findMany();
        for (const setting of settings) {
            setSettingOverride(setting.key, setting.value);
        }
        logger.info(
            { operation: "preloadAppSettings", count: settings.length },
            "App settings preloaded from DB",
        );
    } catch (error) {
        logger.error(
            { operation: "preloadAppSettings" },
            "Failed to preload app settings from DB",
            error instanceof Error ? error : new Error(String(error)),
        );
    }
}
