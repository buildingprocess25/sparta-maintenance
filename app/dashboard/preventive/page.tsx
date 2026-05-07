import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminPreventive, getReportYears } from "./actions";
import { AdminPreventiveTable } from "./_components/admin-preventive-table";
import { ExportPreventiveDialog } from "./_components/export-preventive-dialog";

export const dynamic = "force-dynamic";

export default async function AdminPreventivePage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const currentYear = new Date().getFullYear();
    const defaultBranch = "BALARAJA";

    // Fetch initial data
    const [branches, years] = await Promise.all([
        fetchAllBranchNames(),
        getReportYears(),
    ]);

    const initialData = await getAdminPreventive(null, 20, {
        year: currentYear,
        branchName: defaultBranch
    });

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Checklist Preventif">
                    <ExportPreventiveDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminPreventiveTable 
                        initialData={initialData.rows} 
                        initialNextCursor={initialData.nextCursor} 
                        initialTotalCount={initialData.totalCount}
                        branches={branches} 
                        availableYears={years}
                        defaultBranch={defaultBranch}
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
