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

const STORE_OWNERSHIP_FILTERS = ["REGULAR", "FRANCHISE", "UNKNOWN"] as const;

type StoreOwnershipFilter = (typeof STORE_OWNERSHIP_FILTERS)[number];

function normalizeOwnershipFilter(value?: string): StoreOwnershipFilter | "all" {
    const normalized = value?.trim().toUpperCase();
    return STORE_OWNERSHIP_FILTERS.includes(normalized as StoreOwnershipFilter)
        ? (normalized as StoreOwnershipFilter)
        : "all";
}

type Props = {
    searchParams: Promise<{
        search?: string;
        branch?: string;
        area?: string;
        brand?: string;
        type?: string;
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
    const initialBrand = params.brand?.trim() || "all";
    const initialOwnershipType = normalizeOwnershipFilter(params.type);

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
        brand: initialBrand !== "all" ? initialBrand : undefined,
        ownershipType:
            initialOwnershipType !== "all" ? initialOwnershipType : undefined,
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
                userRole={user.role}
                initialSearch={initialSearch}
                initialBranchName={initialBranchName}
                initialAreaName={initialAreaName}
                initialBrand={initialBrand}
                initialOwnershipType={initialOwnershipType}
            />
        </AdminDashboardShell>
    );
}
