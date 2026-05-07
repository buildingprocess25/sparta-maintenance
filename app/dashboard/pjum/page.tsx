import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminPjum } from "./actions";
import { AdminPjumTable } from "./_components/admin-pjum-table";
import { ExportPjumDialog } from "./_components/export-pjum-dialog";

export const dynamic = "force-dynamic";

export default async function AdminPjumPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    // Fetch initial data
    const branches = await fetchAllBranchNames();
    const initialData = await getAdminPjum(null, 20, {});

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="PJUM">
                    <ExportPjumDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminPjumTable 
                        initialData={initialData.pjums} 
                        initialNextCursor={initialData.nextCursor} 
                        initialTotalCount={initialData.totalCount}
                        branches={branches} 
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
