import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import {
    getAppSetting,
    getPjumPolicySettings,
    getReportSlaDays,
    SETTING_KEYS,
} from "@/lib/app-settings";
import { SettingsWorkbench } from "./_components/settings-workbench";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const [maintenanceSetting, reportSlaDays, pjumPolicy] = await Promise.all([
        getAppSetting(SETTING_KEYS.MAINTENANCE_ENABLED),
        getReportSlaDays(),
        getPjumPolicySettings(),
    ]);
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
            breadcrumbs={[{ label: "Pengaturan Sistem" }]}
            contentClassName="space-y-4"
        >
            <SettingsWorkbench
                initialMaintenanceEnabled={initialEnabled}
                isEnvOverridden={isEnvOverridden}
                initialReportSlaDays={reportSlaDays}
                initialPjumPolicy={pjumPolicy}
            />
        </AdminDashboardShell>
    );
}
