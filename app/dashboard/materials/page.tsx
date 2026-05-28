import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
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
        <AdminDashboardShell
            user={user}
            title="List Material"
            breadcrumbs={[{ label: "Material" }]}
            headerActions={<ExportMaterialsDialog branches={branches} />}
            contentClassName="h-full"
        >
            <AdminMaterialsTable
                initialData={initialData.materials}
                initialNextCursor={initialData.nextCursor}
                initialTotalUniqueCount={initialData.totalUniqueCount}
                branches={branches}
            />
        </AdminDashboardShell>
    );
}
