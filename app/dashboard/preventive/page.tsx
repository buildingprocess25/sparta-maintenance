import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminBranchOptions } from "../queries";
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
    const defaultBranch = "all";
    const bmcBranchLabel = user.branchNames.join(" & ") || "—";

    const [branchOptions, years, initialData] = await Promise.all([
        isAdmin ? getAdminBranchOptions() : Promise.resolve([]),
        getReportYears(),
        getAdminPreventive(null, 20, {
            year: currentYear,
            branchName: defaultBranch,
        }),
    ]);
    const branches = isAdmin
        ? branchOptions.map((branch) => branch.name)
        : user.branchNames;

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

                <main className="flex-1">
                    <div className="min-h-[calc(100vh-16rem)]">
                        <AdminPreventiveTable
                            initialData={initialData}
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
        <AdminDashboardShell
            user={user}
            title="Checklist Preventif"
            breadcrumbs={[{ label: "Checklist Preventif" }]}
            headerActions={<ExportPreventiveDialog branches={branches} />}
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <AdminPreventiveTable
                initialData={initialData}
                branches={branches}
                availableYears={years}
                defaultBranch={defaultBranch}
            />
        </AdminDashboardShell>
    );
}
