import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminStoresTable } from "./_components/admin-stores-table";
import { ExportStoresDialog } from "./_components/export-stores-dialog";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAllBrands } from "@/app/admin/database/queries";
import { getStoreAreaNamesByBranches } from "@/app/bmc/database/queries";
import { getAdminStores } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        search?: string;
        branch?: string;
        area?: string;
    }>;
};

export default async function AdminStoresPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN" && user.role !== "BMC") redirect("/dashboard");

    const params = await searchParams;
    const initialSearch = params.search?.trim() || "";
    const initialBranchName = params.branch?.trim() || "all";
    const initialAreaName = params.area?.trim() || "all";

    const [branches, allBrands] = await Promise.all([
        user.role === "ADMIN"
            ? fetchAllBranchNames()
            : Promise.resolve(
                  user.branchNames
                      .map((branchName) => branchName.trim())
                      .filter((branchName) => branchName.length > 0),
              ),
        getAllBrands(),
    ]);

    const areaNamesByBranch = await getStoreAreaNamesByBranches(branches);

    const initialData = await getAdminStores(null, 20, {
        search: initialSearch || undefined,
        branchName: initialBranchName !== "all" ? initialBranchName : undefined,
        areaName: initialAreaName !== "all" ? initialAreaName : undefined,
    });

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
                areaNames={user.areaNames}
                allBrands={allBrands}
                areaNamesByBranch={areaNamesByBranch}
                canManage
                initialSearch={initialSearch}
                initialBranchName={initialBranchName}
                initialAreaName={initialAreaName}
            />
        </AdminDashboardShell>
    );
}
