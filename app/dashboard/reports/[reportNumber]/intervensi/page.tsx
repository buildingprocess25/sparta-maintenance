import { notFound } from "next/navigation";

import { AdminDashboardShell } from "@/app/dashboard/_components/admin/admin-dashboard-shell";
import { requireRole } from "@/lib/authorization";
import { getRevisionReport } from "@/app/dashboard/intervensi/revisi-laporan/data";
import { RevisiLaporanClient } from "@/app/dashboard/intervensi/revisi-laporan/revisi-laporan-client";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function ReportIntervensiPage({ params }: Props) {
    const user = await requireRole("ADMIN");
    const { reportNumber } = await params;
    const report = await getRevisionReport(reportNumber);

    if (!report) notFound();

    return (
        <AdminDashboardShell
            user={user}
            title="Intervensi Laporan"
            breadcrumbs={[
                {
                    label: "Laporan Maintenance",
                    href: "/dashboard/reports",
                },
                {
                    label: report.reportNumber,
                    href: `/dashboard/reports/${encodeURIComponent(
                        report.reportNumber,
                    )}`,
                },
                { label: "Intervensi" },
            ]}
            contentClassName="h-full"
        >
            <RevisiLaporanClient
                initialQuery={report.reportNumber}
                report={report}
                hideSearch
            />
        </AdminDashboardShell>
    );
}
