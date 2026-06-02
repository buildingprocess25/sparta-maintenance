import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function AdminReportDetailPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const { reportNumber } = await params;

    return (
        <AdminDashboardShell
            user={user}
            title={reportNumber}
            breadcrumbs={[
                { label: "Laporan Maintenance", href: "/dashboard/reports" },
                { label: reportNumber },
            ]}
            contentClassName="h-full"
        >
            <div>ini halaman reportNumber</div>
        </AdminDashboardShell>
    );
}
