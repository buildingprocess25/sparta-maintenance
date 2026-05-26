import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminRealisasiDetail } from "../queries";
import { RealisasiDetailPage } from "./_components/realisasi-detail-page";

export const dynamic = "force-dynamic";

export default async function RealisasiPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const data = await getAdminRealisasiDetail();

    return (
        <AdminDashboardShell user={user} title="Detail Rata-rata Realisasi">
            <RealisasiDetailPage data={data} />
        </AdminDashboardShell>
    );
}
