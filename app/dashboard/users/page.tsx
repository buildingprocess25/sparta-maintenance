import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { AdminUsersTable } from "./_components/admin-users-table";
import { ExportUsersDialog } from "./_components/export-users-dialog";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminUsers } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const [branches, initialData] = await Promise.all([
        fetchAllBranchNames(),
        getAdminUsers(null, 20, {}),
    ]);

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Management User">
                    <ExportUsersDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminUsersTable
                        initialData={initialData.users}
                        initialNextCursor={initialData.nextCursor}
                        initialTotalCount={initialData.totalCount}
                        branches={branches}
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
