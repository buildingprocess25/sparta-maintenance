import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminUsersTable } from "./_components/admin-users-table";
import { ExportUsersDialog } from "./_components/export-users-dialog";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminUsers } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
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
        getAdminUsers(null, 20, {}),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Management User"
            breadcrumbs={[{ label: "User" }]}
            headerActions={
                <ExportUsersDialog
                    branches={branches}
                    allowAdminRole={user.role === "ADMIN"}
                />
            }
            contentClassName="h-full"
        >
            <AdminUsersTable
                initialData={initialData.users}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                branches={branches}
                areaNames={user.areaNames}
                canManage
                allowAdminRole={user.role === "ADMIN"}
            />
        </AdminDashboardShell>
    );
}
