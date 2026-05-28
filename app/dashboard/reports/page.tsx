import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminReportsTable } from "./_components/admin-reports-table";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminReports } from "./actions";
import { ExportReportsDialog } from "./_components/export-reports-dialog";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminReportsPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const { status: initialStatus } = await searchParams;

    const [branches, initialReports] = await Promise.all([
        fetchAllBranchNames(),
        getAdminReports(null, 20, { status: initialStatus || undefined }),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Laporan Maintenance"
            breadcrumbs={[{ label: "Laporan Maintenance" }]}
            headerActions={<ExportReportsDialog branches={branches} />}
            contentClassName="h-full"
        >
            <AdminReportsTable
                initialData={initialReports.reports}
                initialNextCursor={initialReports.nextCursor}
                initialTotalCount={initialReports.totalCount}
                branches={branches}
                initialStatus={initialStatus ?? "all"}
            />
        </AdminDashboardShell>
    );
}
