import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

declare global {
    // Digunakan sebagai in-memory bridge antara Node.js backend dan middleware (Edge Runtime).
    // Berisi sinkronisasi terakhir dari DB. Harus `var` agar bisa menggunakan globalThis di TypeScript.
    // eslint-disable-next-line no-var
    var __spartaSettingsOverrides: Record<string, string> | undefined;
}

export const SETTING_KEYS = {
    MAINTENANCE_ENABLED: "maintenance_enabled",
} as const;

// ----------------------------------------------------------------------------
// In-memory overrides (Bridge)
// Dipakai oleh `proxy.ts` (middleware) karena tidak bisa akses Prisma (DB).
// ----------------------------------------------------------------------------

function getOverridesMap() {
    if (!globalThis.__spartaSettingsOverrides) {
        globalThis.__spartaSettingsOverrides = {};
    }
    return globalThis.__spartaSettingsOverrides;
}

/**
 * Mendapatkan nilai setting dari memory cache.
 */
export function getSettingOverride(key: string): string | undefined {
    return getOverridesMap()[key];
}

/**
 * Mengubah nilai setting di memory cache (dipanggil setelah sukses update DB).
 */
export function setSettingOverride(key: string, value: string) {
    getOverridesMap()[key] = value;
}

// ----------------------------------------------------------------------------
// Database Operations (Hanya boleh dipanggil dari Node.js Runtime / Server Actions)
// ----------------------------------------------------------------------------

export async function getAppSetting(key: string): Promise<string | null> {
    try {
        const setting = await prisma.appSetting.findUnique({
            where: { key },
        });
        return setting?.value ?? null;
    } catch (error) {
        logger.error({ error, operation: "getAppSetting", key }, "Gagal membaca app setting");
        return null;
    }
}

export async function updateAppSetting(key: string, value: string, updatedByNIK?: string): Promise<void> {
    try {
        await prisma.appSetting.upsert({
            where: { key },
            update: { value, updatedBy: updatedByNIK },
            create: { key, value, updatedBy: updatedByNIK },
        });
    } catch (error) {
        logger.error({ error, operation: "updateAppSetting", key }, "Gagal update app setting");
        throw error;
    }
}
