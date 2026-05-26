import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { MaintenanceToggle } from "./_components/maintenance-toggle";
import { getAppSetting, SETTING_KEYS } from "@/lib/app-settings";
import { IconAlertTriangle } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const maintenanceSetting = await getAppSetting(
        SETTING_KEYS.MAINTENANCE_ENABLED,
    );
    const initialEnabled =
        maintenanceSetting === "true" ||
        maintenanceSetting === "1" ||
        maintenanceSetting === "yes" ||
        maintenanceSetting === "on";

    // Peringatan jika di override via ENV
    const isEnvOverridden =
        process.env.MAINTENANCE_MODE === "true" ||
        process.env.MAINTENANCE_MODE === "1";

    return (
        <AdminDashboardShell
            user={user}
            title="Pengaturan Sistem"
            contentClassName="grid gap-6 lg:grid-cols-2"
        >
            {isEnvOverridden && (
                <div className="flex max-w-4xl items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                    <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
                        <IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-amber-800 dark:text-amber-400">
                            Peringatan Environment Variable
                        </h3>
                        <p className="text-sm leading-relaxed text-amber-700/80 dark:text-amber-400/80">
                            Maintenance mode saat ini dipaksa aktif melalui{" "}
                            <code>MAINTENANCE_MODE</code> di server
                            (Environment Variable). Perubahan melalui panel di
                            bawah akan tersimpan ke database, tetapi{" "}
                            <span className="font-semibold underline underline-offset-2">
                                tidak akan berpengaruh
                            </span>{" "}
                            hingga konfigurasi server diubah.
                        </p>
                    </div>
                </div>
            )}
            <MaintenanceToggle initialEnabled={initialEnabled} />
        </AdminDashboardShell>
    );
}
