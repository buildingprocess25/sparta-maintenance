import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminBranchOptions } from "../queries";
import { getAdminPjum } from "./actions";
import { AdminPjumTable } from "./_components/admin-pjum-table";
import { ExportPjumDialog } from "./_components/export-pjum-dialog";

export const dynamic = "force-dynamic";

export default async function AdminPjumPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const [branchOptions, initialData] = await Promise.all([
        getAdminBranchOptions(),
        getAdminPjum(null, 20, {}),
    ]);
    const branches = branchOptions.map((branch) => branch.name);

    return (
        <AdminDashboardShell
            user={user}
            title="PJUM"
            breadcrumbs={[{ label: "Dokumen PJUM" }]}
            headerActions={<ExportPjumDialog branches={branches} />}
            contentClassName="h-full"
        >
            <AdminPjumTable
                initialData={initialData.pjums}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                initialSummary={initialData.summary}
                branches={branches}
            />
        </AdminDashboardShell>
    );
}
