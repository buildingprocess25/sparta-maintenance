import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminAhoTicketsTable } from "./_components/admin-aho-tickets-table";
import { ImportAhoTicketsDialog } from "./_components/import-aho-tickets-dialog";
import { getAdminAhoTickets } from "./actions";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAllBrands } from "@/app/admin/database/queries";
import { getStoreAreaNamesByBranches } from "@/app/bmc/database/queries";

export const dynamic = "force-dynamic";

export default async function AdminAhoTicketsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    
    // Sesuai spec, menu ini hanya untuk role ADMIN
    if (user.role !== "ADMIN") redirect("/dashboard");

    const [branches, initialData, allBrands] = await Promise.all([
        fetchAllBranchNames(),
        getAdminAhoTickets(null, 20, {}),
        getAllBrands(),
    ]);

    const areaNamesByBranch = await getStoreAreaNamesByBranches(branches);

    return (
        <AdminDashboardShell
            user={user}
            title="Master Tiket AHO"
            breadcrumbs={[{ label: "Master Data" }, { label: "Tiket AHO" }]}
            contentClassName="h-full"
        >
            <AdminAhoTicketsTable
                initialData={initialData.tickets}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                branches={branches}
                allBrands={allBrands}
                areaNamesByBranch={areaNamesByBranch}
            />
        </AdminDashboardShell>
    );
}
