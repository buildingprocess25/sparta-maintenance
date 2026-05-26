import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
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
        <AdminDashboardShell
            user={user}
            title="PJUM"
            headerActions={<ExportPjumDialog branches={branches} />}
            contentClassName="h-full"
        >
            <AdminPjumTable
                initialData={initialData.pjums}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                branches={branches}
            />
        </AdminDashboardShell>
    );
}
