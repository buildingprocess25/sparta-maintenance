"use server";

import { requireRole } from "@/lib/authorization";
import { updateAppSetting, setSettingOverride, SETTING_KEYS } from "@/lib/app-settings";
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
