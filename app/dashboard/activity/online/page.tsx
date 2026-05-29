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
    if (user.role !== "ADMIN") redirect("/dashboard");

    const [branches, initialData] = await Promise.all([
        fetchAllBranchNames(),
        getAdminOnlineUsers(null, 20, {}),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="User Online"
            breadcrumbs={[
                { label: "Aktivitas User", href: "/dashboard/activity" },
                { label: "User Online" },
            ]}
            contentClassName="h-full"
        >
            <AdminOnlineUsersTable
                initialData={initialData.users}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                branches={branches}
            />
        </AdminDashboardShell>
    );
}
