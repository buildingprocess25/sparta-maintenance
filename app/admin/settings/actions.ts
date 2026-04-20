"use server";

import { requireRole } from "@/lib/authorization";
import { SETTING_KEYS, setSettingOverride, updateAppSetting } from "@/lib/app-settings";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function updateMaintenanceSetting(enabled: boolean) {
    const user = await requireRole("ADMIN");

    try {
        const value = enabled ? "true" : "false";

        // 1. Simpan ke database agar persisten
        await updateAppSetting(SETTING_KEYS.MAINTENANCE_ENABLED, value, user.NIK);

        // 2. Update edge override (memori Node.js)
        // Note: Ini mensinkronkan memory di current process, tapi kalau aplikasi jalan
        // multi-process (Vercel serverless / cluster), cache ini hanya berlaku di function instance yang mengeksekusi ini.
        // Itulah kenapa revalidatePath memanggil request baru yang akan memicu komponen settings meload DB
        // dan mensinkronisasikan instance memori yang merender path tersebut.
        setSettingOverride(SETTING_KEYS.MAINTENANCE_ENABLED, value);

        // 3. Catat di sistem audit log
        logger.info(
            { operation: "admin.settings.update", settingKey: SETTING_KEYS.MAINTENANCE_ENABLED, newValue: value, adminNIK: user.NIK },
            "Status Maintenance Mode diubah"
        );

        // 4. Force Next.js untuk merender ulang seluruh layout agar middleware + server components mendapatkan update
        revalidatePath("/", "layout");

        return { success: true };
    } catch (error) {
        logger.error({ error, operation: "updateMaintenanceSetting" }, "Gagal menyimpan pengaturan maintenance");
        return { success: false, error: "Gagal menyimpan pengaturan. Silakan coba lagi." };
    }
}
