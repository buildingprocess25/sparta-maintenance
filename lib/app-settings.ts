import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ReportStatusKey } from "@/lib/report-status";

declare global {
    // Digunakan sebagai in-memory bridge antara Node.js backend dan middleware (Edge Runtime).
    // Berisi sinkronisasi terakhir dari DB. Harus `var` agar bisa menggunakan globalThis di TypeScript.
     
    var __spartaSettingsOverrides: Record<string, string> | undefined;
}

export const SETTING_KEYS = {
    MAINTENANCE_ENABLED: "maintenance_enabled",
    REPORT_SLA_PENDING_ESTIMATION_DAYS:
        "report_sla_pending_estimation_days",
    REPORT_SLA_ESTIMATION_APPROVED_DAYS:
        "report_sla_estimation_approved_days",
    REPORT_SLA_ESTIMATION_REVISION_DAYS:
        "report_sla_estimation_revision_days",
    REPORT_SLA_IN_PROGRESS_DAYS: "report_sla_in_progress_days",
    REPORT_SLA_PENDING_REVIEW_DAYS: "report_sla_pending_review_days",
    REPORT_SLA_APPROVED_BMC_DAYS: "report_sla_approved_bmc_days",
    REPORT_SLA_REVIEW_REVISION_DAYS: "report_sla_review_revision_days",
    PJUM_PENDING_STALE_DAYS: "pjum_pending_stale_days",
    PJUM_WEEKLY_ADVANCE_AMOUNT: "pjum_weekly_advance_amount",
    PJUM_PERIOD_DAYS: "pjum_period_days",
} as const;

export const DEFAULT_REPORT_SLA_DAYS: Partial<Record<ReportStatusKey, number>> =
    {
        PENDING_ESTIMATION: 1,
        ESTIMATION_APPROVED: 3,
        ESTIMATION_REJECTED_REVISION: 2,
        IN_PROGRESS: 7,
        PENDING_REVIEW: 1,
        APPROVED_BMC: 1,
        REVIEW_REJECTED_REVISION: 2,
    };

export const REPORT_SLA_SETTING_FIELDS = [
    {
        status: "PENDING_ESTIMATION",
        key: SETTING_KEYS.REPORT_SLA_PENDING_ESTIMATION_DAYS,
    },
    {
        status: "ESTIMATION_APPROVED",
        key: SETTING_KEYS.REPORT_SLA_ESTIMATION_APPROVED_DAYS,
    },
    {
        status: "ESTIMATION_REJECTED_REVISION",
        key: SETTING_KEYS.REPORT_SLA_ESTIMATION_REVISION_DAYS,
    },
    {
        status: "IN_PROGRESS",
        key: SETTING_KEYS.REPORT_SLA_IN_PROGRESS_DAYS,
    },
    {
        status: "PENDING_REVIEW",
        key: SETTING_KEYS.REPORT_SLA_PENDING_REVIEW_DAYS,
    },
    {
        status: "APPROVED_BMC",
        key: SETTING_KEYS.REPORT_SLA_APPROVED_BMC_DAYS,
    },
    {
        status: "REVIEW_REJECTED_REVISION",
        key: SETTING_KEYS.REPORT_SLA_REVIEW_REVISION_DAYS,
    },
] as const satisfies readonly {
    status: keyof typeof DEFAULT_REPORT_SLA_DAYS;
    key: string;
}[];

export const DEFAULT_PJUM_POLICY_SETTINGS = {
    pendingStaleDays: 7,
    weeklyAdvanceAmount: 1_000_000,
    periodDays: 7,
};



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

export type AppSettingRecord = {
    key: string;
    value: string;
    updatedAt: Date;
    updatedBy: string | null;
};

export async function getAppSettings(
    keys: readonly string[],
): Promise<Record<string, AppSettingRecord | null>> {
    try {
        const rows = await prisma.appSetting.findMany({
            where: { key: { in: [...keys] } },
        });
        const map = new Map(rows.map((row) => [row.key, row]));

        return Object.fromEntries(
            keys.map((key) => [key, map.get(key) ?? null]),
        ) as Record<string, AppSettingRecord | null>;
    } catch (error) {
        logger.error(
            { error, operation: "getAppSettings", keys },
            "Gagal membaca app settings",
        );
        return Object.fromEntries(keys.map((key) => [key, null])) as Record<
            string,
            AppSettingRecord | null
        >;
    }
}

function parsePositiveInteger(
    value: string | null | undefined,
    fallback: number,
) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getReportSlaDays(): Promise<
    Partial<Record<ReportStatusKey, number>>
> {
    const settings = await getAppSettings(
        REPORT_SLA_SETTING_FIELDS.map((field) => field.key),
    );

    return Object.fromEntries(
        REPORT_SLA_SETTING_FIELDS.map((field) => {
            const fallback = DEFAULT_REPORT_SLA_DAYS[field.status] ?? 1;
            return [
                field.status,
                parsePositiveInteger(settings[field.key]?.value, fallback),
            ];
        }),
    ) as Partial<Record<ReportStatusKey, number>>;
}

export async function getPjumPolicySettings() {
    const settings = await getAppSettings([
        SETTING_KEYS.PJUM_PENDING_STALE_DAYS,
        SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT,
        SETTING_KEYS.PJUM_PERIOD_DAYS,
    ]);

    return {
        pendingStaleDays: parsePositiveInteger(
            settings[SETTING_KEYS.PJUM_PENDING_STALE_DAYS]?.value,
            DEFAULT_PJUM_POLICY_SETTINGS.pendingStaleDays,
        ),
        weeklyAdvanceAmount: parsePositiveInteger(
            settings[SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT]?.value,
            DEFAULT_PJUM_POLICY_SETTINGS.weeklyAdvanceAmount,
        ),
        periodDays: parsePositiveInteger(
            settings[SETTING_KEYS.PJUM_PERIOD_DAYS]?.value,
            DEFAULT_PJUM_POLICY_SETTINGS.periodDays,
        ),
    };
}

export async function getBmsInitialBalance(): Promise<number> {
    const setting = await getAppSetting(SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT);
    return parsePositiveInteger(setting, DEFAULT_PJUM_POLICY_SETTINGS.weeklyAdvanceAmount);
}
