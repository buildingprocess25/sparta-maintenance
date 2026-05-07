import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { AdminStoresTable } from "./_components/admin-stores-table";
import { ExportStoresDialog } from "./_components/export-stores-dialog";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminStores } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const [branches, initialData] = await Promise.all([
        fetchAllBranchNames(),
        getAdminStores(null, 20, {}),
    ]);

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Management Toko">
                    <ExportStoresDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminStoresTable
                        initialData={initialData.stores}
                        initialNextCursor={initialData.nextCursor}
                        initialTotalCount={initialData.totalCount}
                        branches={branches}
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
