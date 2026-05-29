import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getRealisasiPageData } from "./queries";
import { RealisasiContent } from "./_components/realisasi-content";
import { RealisasiFilter } from "./_components/realisasi-filter";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{ period?: string; branch?: string }>;
};

export default async function RealisasiPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const params = await searchParams;
    const periodRaw = params.period ?? "ytd";
    const branchFilter = params.branch ?? "all";

    const [data, allBranches] = await Promise.all([
        getRealisasiPageData(periodRaw, branchFilter),
        fetchAllBranchNames(),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Realisasi"
            breadcrumbs={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Realisasi" },
            ]}
            headerActions={
                <RealisasiFilter
                    initialPeriod={periodRaw}
                    initialBranch={branchFilter}
                    branches={allBranches}
                />
            }
        >
            <RealisasiContent
                kpi={data.kpi}
                monthly={data.monthly}
                branches={data.branches}
                periodRaw={periodRaw}
            />
        </AdminDashboardShell>
    );
}
