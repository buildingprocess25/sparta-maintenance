import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { AdminDashboardShell } from "@/app/dashboard/_components/admin/admin-dashboard-shell";
import { RevisiLaporanClient } from "./revisi-laporan-client";
import { getRevisionReport } from "./data";

type Props = {
    searchParams: Promise<{ q?: string }>;
};

export default async function RevisiLaporanPage({ searchParams }: Props) {
    const user = await requireRole("ADMIN");
    const { q } = await searchParams;

    if (q && q.trim()) {
        redirect(
            `/dashboard/reports/${encodeURIComponent(q.trim())}/intervensi`,
        );
    }

    const report = await getRevisionReport(q ?? "");

    return (
        <AdminDashboardShell
            user={user}
            title="Revisi Laporan Maintenance"
            breadcrumbs={[{ label: "Revisi Laporan" }]}
            contentClassName="h-full"
        >
            <RevisiLaporanClient initialQuery={q ?? ""} report={report} />
        </AdminDashboardShell>
    );
}
