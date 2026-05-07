import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
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
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Pengaturan Sistem" />
                <div className="grid grid-cols-2 gap-6 p-4 lg:p-6">
                    {isEnvOverridden && (
                        <div className="flex items-start gap-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl shadow-sm max-w-4xl">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                                <IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-amber-800 dark:text-amber-400">
                                    Peringatan Environment Variable
                                </h3>
                                <p className="text-sm text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                                    Maintenance mode saat ini dipaksa aktif
                                    melalui <code>MAINTENANCE_MODE</code> di
                                    server (Environment Variable). Perubahan
                                    melalui panel di bawah akan tersimpan ke
                                    database, tetapi{" "}
                                    <span className="font-semibold underline underline-offset-2">
                                        tidak akan berpengaruh
                                    </span>{" "}
                                    hingga konfigurasi server diubah.
                                </p>
                            </div>
                        </div>
                    )}
                    <MaintenanceToggle initialEnabled={initialEnabled} />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
