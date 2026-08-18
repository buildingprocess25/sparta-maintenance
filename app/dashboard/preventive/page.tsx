import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminPreventive, getPreventiveBranchOptions, getReportYears } from "./actions";
import { AdminPreventiveTable } from "./_components/admin-preventive-table";
import { ExportPreventiveDialog } from "./_components/export-preventive-dialog";
import { getJakartaYear } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPreventivePage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const isAdmin = user.role === "ADMIN";
    const currentYear = getJakartaYear();
    const defaultBranch = "all";

    const [branchOptions, years, initialData] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve([]),
        getReportYears(),
        getAdminPreventive(null, 20, {
            year: currentYear,
            branchName: defaultBranch,
            completion: "completed",
        }),
    ]);
    const branches = isAdmin
        ? branchOptions
        : user.branchNames;

    return (
        <AdminDashboardShell
            user={user}
            title="Checklist Preventif"
            breadcrumbs={[{ label: "Checklist Preventif" }]}
            headerActions={
                <ExportPreventiveDialog
                    branches={branches}
                    showBranchFilter={isAdmin}
                    showBrandFilter={isAdmin}
                />
            }
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <AdminPreventiveTable
                initialData={initialData}
                branches={branches}
                availableYears={years}
                defaultBranch={defaultBranch}
                showBranchControls={isAdmin}
                showBrandFilter={isAdmin}
            />
        </AdminDashboardShell>
    );
}
