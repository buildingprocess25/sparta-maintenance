import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminPreventive, getPreventiveBranchOptions, getReportYears } from "./actions";
import { getPreventiveCompletionForTab } from "./preventive-dashboard";
import { AdminPreventiveTable } from "./_components/admin-preventive-table";
import { ExportPreventiveDialog } from "./_components/export-preventive-dialog";
import { getJakartaYear } from "@/lib/time";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import type { PreventiveQuarter } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        branch?: string;
        year?: string;
        quarter?: string;
        brand?: string;
        tab?: string;
    }>;
};

const VALID_QUARTERS = new Set(["1", "2", "3", "4"]);
const VALID_TABS = new Set(["quarter", "history"]);

function normalizeQuarter(value?: string): PreventiveQuarter | undefined {
    if (value && VALID_QUARTERS.has(value)) {
        return Number(value) as PreventiveQuarter;
    }
    return undefined;
}

export default async function AdminPreventivePage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const isAdmin = user.role === "ADMIN";
    const currentYear = getJakartaYear();
    const params = await searchParams;

    const initialBranch = params.branch?.trim() || "all";
    const rawYear = Number(params.year);
    const initialYear =
        rawYear >= 2020 && rawYear <= currentYear + 1 ? rawYear : currentYear;
    const initialQuarter = normalizeQuarter(params.quarter);
    const initialBrand = isAdmin ? normalizeStoreBrandFilter(params.brand) : "ALL";
    const initialTab =
        params.tab && VALID_TABS.has(params.tab) ? params.tab : "quarter";

    const [branchOptions, years, initialData] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve([]),
        getReportYears(),
        getAdminPreventive(null, 20, {
            year: initialYear,
            branchName: initialBranch,
            brand: initialBrand !== "ALL" ? initialBrand : undefined,
            completion: getPreventiveCompletionForTab(initialTab),
            ...(initialQuarter ? { quarter: initialQuarter } : {}),
        }),
    ]);
    const branches = isAdmin ? branchOptions : user.branchNames;

    return (
        <AdminDashboardShell
            user={user}
            title="Checklist Preventif"
            breadcrumbs={[{ label: "Checklist Preventif" }]}
            headerActions={
                <ExportPreventiveDialog
                    branches={branches}
                    showBranchFilter={isAdmin}
                    showBrandFilter={isAdmin}
                />
            }
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <AdminPreventiveTable
                initialData={initialData}
                branches={branches}
                availableYears={years}
                defaultBranch={initialBranch}
                showBranchControls={isAdmin}
                showBrandFilter={isAdmin}
                initialYear={initialYear}
                initialQuarter={initialQuarter}
                initialBrand={initialBrand}
                initialTab={initialTab}
            />
        </AdminDashboardShell>
    );
}
