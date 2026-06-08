import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import { getAdminReportDetail } from "./queries";
import { ReportApprovalActions } from "./_components/report-approval-actions";
import { ReportDetailWorkbench } from "./_components/report-detail-workbench";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function AdminReportDetailPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const { reportNumber } = await params;
    const report = await getAdminReportDetail(reportNumber);
    if (!report) notFound();

    if (!canAccessDashboardReport(user, report)) {
        redirect("/dashboard");
    }

    return (
        <AdminDashboardShell
            user={user}
            title={report.reportNumber}
            breadcrumbs={[
                { label: "Laporan Maintenance", href: "/dashboard/reports" },
                { label: report.reportNumber },
            ]}
            headerActions={
                hasReportApprovalAction(user.role, report.status) ? (
                    <ReportApprovalActions
                        reportNumber={report.reportNumber}
                        status={report.status}
                        viewerRole={user.role}
                    />
                ) : undefined
            }
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <ReportDetailWorkbench report={report} />
        </AdminDashboardShell>
    );
}

type DashboardReportUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
type DashboardReportDetail = NonNullable<
    Awaited<ReturnType<typeof getAdminReportDetail>>
>;

function canAccessDashboardReport(
    user: DashboardReportUser,
    report: DashboardReportDetail,
) {
    if (user.role === "ADMIN") return true;

    if (user.role === "BMC") {
        return user.branchNames.includes(report.branchName);
    }

    if (user.role === "BMS") {
        return report.submittedBy.nik === user.NIK;
    }

    if (user.role === "BNM_MANAGER") {
        return user.branchNames.includes(report.branchName);
    }

    return false;
}

function hasReportApprovalAction(role: string, status: string) {
    return (
        (role === "BMC" &&
            (status === "PENDING_ESTIMATION" ||
                status === "PENDING_REVIEW")) ||
        (role === "BNM_MANAGER" && status === "APPROVED_BMC")
    );
}
