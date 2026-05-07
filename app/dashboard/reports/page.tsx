import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "../_components/admin/admin-site-header";
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
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Laporan Maintenance">
                    <ExportReportsDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminReportsTable
                        initialData={initialReports.reports}
                        initialNextCursor={initialReports.nextCursor}
                        initialTotalCount={initialReports.totalCount}
                        branches={branches}
                        initialStatus={initialStatus ?? "all"}
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
