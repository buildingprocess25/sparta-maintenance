import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getRealisasiPageData, type RealisasiPeriod } from "./queries";
import { RealisasiContent } from "./_components/realisasi-content";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set<string>(["ytd", "30d", "90d", "12m"]);

function normalizePeriod(value?: string): RealisasiPeriod {
    if (value && VALID_PERIODS.has(value)) return value as RealisasiPeriod;
    return "ytd";
}

type Props = {
    searchParams: Promise<{ period?: string; branch?: string }>;
};

export default async function RealisasiPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const params = await searchParams;
    const period = normalizePeriod(params.period);
    const branchFilter = params.branch ?? "all";

    const [data, allBranches] = await Promise.all([
        getRealisasiPageData(period, branchFilter),
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
        >
            <RealisasiContent
                kpi={data.kpi}
                monthly={data.monthly}
                branches={data.branches}
                period={period}
                branchFilter={branchFilter}
                allBranches={allBranches}
            />
        </AdminDashboardShell>
    );
}
