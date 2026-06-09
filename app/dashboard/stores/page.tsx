import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminStoresTable } from "./_components/admin-stores-table";
import { ExportStoresDialog } from "./_components/export-stores-dialog";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminStores } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN" && user.role !== "BMC") redirect("/dashboard");

    const [branches, initialData] = await Promise.all([
        user.role === "ADMIN"
            ? fetchAllBranchNames()
            : Promise.resolve(
                  user.branchNames
                      .map((branchName) => branchName.trim())
                      .filter((branchName) => branchName.length > 0),
              ),
        getAdminStores(null, 20, {}),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Management Toko"
            breadcrumbs={[{ label: "Toko" }]}
            headerActions={<ExportStoresDialog branches={branches} />}
            contentClassName="h-full"
        >
            <AdminStoresTable
                initialData={initialData.stores}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                branches={branches}
                canManage
            />
        </AdminDashboardShell>
    );
}
