import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import { AdminOnlineUsersTable } from "./_components/admin-online-users-table";
import { getAdminOnlineUsers } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminOnlineUsersPage() {
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
        getAdminOnlineUsers(null, 20, {}),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="User Aktif"
            breadcrumbs={[
                { label: "Aktivitas User", href: "/dashboard/activity" },
                { label: "User Aktif" },
            ]}
            contentClassName="h-full"
        >
            <AdminOnlineUsersTable
                initialData={initialData.users}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                initialOnlineCount={initialData.onlineCount}
                initialActiveTodayCount={initialData.activeTodayCount}
                branches={branches}
            />
        </AdminDashboardShell>
    );
}
