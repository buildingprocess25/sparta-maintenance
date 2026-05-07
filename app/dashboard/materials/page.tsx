import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { AdminMaterialsTable } from "./_components/admin-materials-table";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminMaterials } from "./actions";
import { ExportMaterialsDialog } from "./_components/export-materials-dialog";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    // Fetch initial data
    const branches = await fetchAllBranchNames();
    const initialData = await getAdminMaterials(null, 20, {});

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="List Material">
                    <ExportMaterialsDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminMaterialsTable 
                        initialData={initialData.materials} 
                        initialNextCursor={initialData.nextCursor} 
                        initialTotalUniqueCount={initialData.totalUniqueCount}
                        branches={branches} 
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
