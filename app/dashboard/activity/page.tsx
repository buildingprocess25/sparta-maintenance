import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "../_components/admin/admin-trend-filter";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { AdminActivityTable } from "./_components/admin-activity-table";
import { getAdminActivityEvents } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{ period?: string | string[] }>;
};

function normalizePeriod(value?: string | string[]) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw && /^\d{2}-\d{4}$/.test(raw)) return raw;
    return "ytd";
}

export default async function AdminActivityPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN" && user.role !== "BMC") redirect("/dashboard");

    const params = await searchParams;
    const period = normalizePeriod(params.period);

    const [branches, initialData] = await Promise.all([
        user.role === "ADMIN"
            ? fetchAllBranchNames()
            : Promise.resolve(
                  user.branchNames
                      .map((branchName) => branchName.trim())
                      .filter((branchName) => branchName.length > 0),
              ),
        getAdminActivityEvents(0, 20, period, {}),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Aktivitas User"
            breadcrumbs={[{ label: "Aktivitas User" }]}
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={period}
                    basePath="/dashboard/activity"
                />
            }
            contentClassName="h-full"
        >
            <AdminActivityTable
                initialData={initialData.events}
                initialNextOffset={initialData.nextOffset}
                initialTotalCount={initialData.totalCount}
                initialSummary={initialData.summary}
                branches={branches}
                period={period}
            />
        </AdminDashboardShell>
    );
}
