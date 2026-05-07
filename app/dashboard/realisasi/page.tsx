import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { getAdminRealisasiDetail } from "../queries";
import { RealisasiDetailPage } from "./_components/realisasi-detail-page";

export const dynamic = "force-dynamic";

export default async function RealisasiPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const data = await getAdminRealisasiDetail();

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Detail Rata-rata Realisasi" />
                <div className="flex flex-col gap-6 p-4 lg:p-6">
                    <RealisasiDetailPage data={data} />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
