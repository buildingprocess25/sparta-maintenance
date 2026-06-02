import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminReportsTable } from "./_components/admin-reports-table";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminReports } from "./actions";
import { ExportReportsDialog } from "./_components/export-reports-dialog";
import { isReportStatusKey } from "@/lib/report-status";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        status?: string;
        pjumStatus?: string;
        branchName?: string;
    }>;
};

function normalizeStatus(value?: string) {
    if (!value || value === "all") return undefined;
    return isReportStatusKey(value) ? value : undefined;
}

function normalizePjumStatus(value?: string) {
    if (value === "exported" || value === "not_exported") return value;
    return undefined;
}

export default async function AdminReportsPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const params = await searchParams;
    const initialStatus = normalizeStatus(params.status);
    const initialPjumStatus = normalizePjumStatus(params.pjumStatus);
    const initialBranchName = params.branchName?.trim() || undefined;

    const [branches, initialReports] = await Promise.all([
        fetchAllBranchNames(),
        getAdminReports(null, 20, {
            status: initialStatus,
            pjumStatus: initialPjumStatus,
            branchName: initialBranchName,
        }),
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
                initialPjumStatus={initialPjumStatus ?? "all"}
                initialBranchName={initialBranchName ?? "all"}
            />
        </AdminDashboardShell>
    );
}
