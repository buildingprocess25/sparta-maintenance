"use server";

import { requireRole } from "@/lib/authorization";
import {
    REPORT_SLA_SETTING_FIELDS,
    SETTING_KEYS,
    setSettingOverride,
    updateAppSetting,
} from "@/lib/app-settings";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function toggleMaintenanceMode(enabled: boolean) {
    try {
        const user = await requireRole("ADMIN");
        const valueStr = enabled ? "true" : "false";
        
        await updateAppSetting(SETTING_KEYS.MAINTENANCE_ENABLED, valueStr, user.NIK);
        setSettingOverride(SETTING_KEYS.MAINTENANCE_ENABLED, valueStr);
        
        logger.info(
            { operation: "toggleMaintenanceMode", enabled, updatedBy: user.NIK },
            "Maintenance mode toggled"
        );
        
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        logger.error({ operation: "toggleMaintenanceMode", error }, "Failed to toggle maintenance mode");
        return { success: false, error: "Gagal mengubah mode maintenance" };
    }
}

type UpdateOperationalSettingsInput = {
    reportSlaDays: Record<string, number>;
    pjumPendingStaleDays: number;
    pjumWeeklyAdvanceAmount: number;
    pjumPeriodDays: number;
};

function normalizePositiveInteger(value: unknown, label: string) {
    const parsed =
        typeof value === "number"
            ? value
            : Number.parseInt(String(value ?? ""), 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${label} harus lebih dari 0`);
    }

    return Math.round(parsed);
}

export async function updateOperationalSettings(
    input: UpdateOperationalSettingsInput,
) {
    try {
        const user = await requireRole("ADMIN");
        const updates: Array<{ key: string; value: string }> = [];

        for (const field of REPORT_SLA_SETTING_FIELDS) {
            updates.push({
                key: field.key,
                value: String(
                    normalizePositiveInteger(
                        input.reportSlaDays[field.status],
                        `SLA ${field.status}`,
                    ),
                ),
            });
        }

        updates.push(
            {
                key: SETTING_KEYS.PJUM_PENDING_STALE_DAYS,
                value: String(
                    normalizePositiveInteger(
                        input.pjumPendingStaleDays,
                        "Batas pending PJUM",
                    ),
                ),
            },
            {
                key: SETTING_KEYS.PJUM_WEEKLY_ADVANCE_AMOUNT,
                value: String(
                    normalizePositiveInteger(
                        input.pjumWeeklyAdvanceAmount,
                        "Uang muka mingguan BMS",
                    ),
                ),
            },
            {
                key: SETTING_KEYS.PJUM_PERIOD_DAYS,
                value: String(
                    normalizePositiveInteger(
                        input.pjumPeriodDays,
                        "Periode PJUM",
                    ),
                ),
            }
        );

        for (const update of updates) {
            await updateAppSetting(update.key, update.value, user.NIK);
        }

        logger.info(
            {
                operation: "updateOperationalSettings",
                updatedBy: user.NIK,
                settingKeys: updates.map((update) => update.key),
            },
            "Operational settings updated",
        );

        revalidatePath("/dashboard/settings");
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/reports");
        revalidatePath("/dashboard/pjum");

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "updateOperationalSettings", error },
            "Failed to update operational settings",
        );
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Gagal menyimpan pengaturan operasional",
        };
    }
}
