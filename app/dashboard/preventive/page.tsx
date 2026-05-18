import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "../_components/admin/admin-site-header";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminPreventive, getReportYears } from "./actions";
import { AdminPreventiveTable } from "./_components/admin-preventive-table";
import { ExportPreventiveDialog } from "./_components/export-preventive-dialog";

export const dynamic = "force-dynamic";

export default async function AdminPreventivePage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN" && user.role !== "BMC") redirect("/dashboard");

    const isAdmin = user.role === "ADMIN";
    const currentYear = new Date().getFullYear();
    const defaultBranch = isAdmin ? "BALARAJA" : "all";
    const bmcBranchLabel = user.branchNames.join(" & ") || "—";

    // Fetch initial data
    const [branches, years] = await Promise.all([
        isAdmin ? fetchAllBranchNames() : Promise.resolve(user.branchNames),
        getReportYears(),
    ]);

    const initialData = await getAdminPreventive(null, 20, {
        year: currentYear,
        branchName: defaultBranch,
    });

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col bg-muted/20">
                <Header
                    variant="dashboard"
                    title="Checklist Preventif"
                    description="Monitoring preventive area cabang"
                    showBackButton
                    backHref="/dashboard"
                    logo={false}
                />

                <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl space-y-6">
                    <div className="min-h-[calc(100vh-16rem)]">
                        <AdminPreventiveTable
                            initialData={initialData.rows}
                            initialNextCursor={initialData.nextCursor}
                            initialTotalCount={initialData.totalCount}
                            branches={branches}
                            availableYears={years}
                            defaultBranch={defaultBranch}
                            lockedBranchLabel={bmcBranchLabel}
                            actions={
                                <ExportPreventiveDialog
                                    branches={branches}
                                    allowAllBranches={false}
                                />
                            }
                        />
                    </div>
                </main>

                <Footer />
            </div>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Checklist Preventif">
                    <ExportPreventiveDialog branches={branches} />
                </SiteHeader>
                <div className="flex flex-col gap-6 p-4 lg:p-6 h-full">
                    <AdminPreventiveTable
                        initialData={initialData.rows}
                        initialNextCursor={initialData.nextCursor}
                        initialTotalCount={initialData.totalCount}
                        branches={branches}
                        availableYears={years}
                        defaultBranch={defaultBranch}
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
