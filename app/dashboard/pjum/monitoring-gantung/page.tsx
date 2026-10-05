import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import { MonitoringGantungContent } from "./_components/monitoring-gantung-content";
import { getAdminBranchOptions } from "../../queries";

export const dynamic = "force-dynamic";

export default async function MonitoringGantungPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    
    // Only Admin, BMC, BNM_MANAGER should access this
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const branchOptions = await getAdminBranchOptions();
    const branches = branchOptions.map(b => b.name);

    return (
        <AdminDashboardShell
            user={user}
            title="Monitoring Laporan Gantung"
            breadcrumbs={[
                { label: "Dokumen PJUM", href: "/dashboard/pjum" },
                { label: "Monitoring Gantung" }
            ]}
            contentClassName="h-full p-0 flex flex-col"
        >
            <MonitoringGantungContent branches={branches} />
        </AdminDashboardShell>
    );
}
