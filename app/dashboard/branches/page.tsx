import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "../_components/admin/admin-trend-filter";
import { AdminBranchesTable } from "./_components/admin-branches-table";
import { getAdminBranchesData } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{ period?: string | string[] }>;
};

function normalizePeriod(value?: string | string[]) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw && /^\d{2}-\d{4}$/.test(raw)) return raw;
    return "ytd";
}

export default async function AdminBranchesPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (!["ADMIN", "BMC", "BNM_MANAGER"].includes(user.role)) {
        redirect("/dashboard");
    }

    const params = await searchParams;
    const period = normalizePeriod(params.period);
    const data = await getAdminBranchesData(period);

    return (
        <AdminDashboardShell
            user={user}
            title="Performa Cabang"
            breadcrumbs={[{ label: "Performa Cabang" }]}
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={period}
                    basePath="/dashboard/branches"
                />
            }
            contentClassName="h-full"
        >
            <AdminBranchesTable data={data} />
        </AdminDashboardShell>
    );
}
