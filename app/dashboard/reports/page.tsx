import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminReportsTable } from "./_components/admin-reports-table";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminReports } from "./actions";
import { ExportReportsDialog } from "./_components/export-reports-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeletedReportsTable } from "./_components/deleted-reports-table";
import { isReportStatusKey } from "@/lib/report-status";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        status?: string;
        pjumStatus?: string;
        branchName?: string;
        areaName?: string;
        scope?: string;
        sla?: string;
        review?: string;
        revision?: string;
        brand?: string;
        fromDate?: string;
        toDate?: string;
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

function normalizeScope(params: Awaited<Props["searchParams"]>) {
    if (params.scope === "active" || params.status === "active") {
        return "active";
    }
    if (params.scope === "overdue" || params.sla === "overdue") {
        return "overdue";
    }
    if (params.scope === "review_bmc" || params.review === "bmc") {
        return "review_bmc";
    }
    if (params.scope === "review_bnm" || params.review === "bnm") {
        return "review_bnm";
    }
    if (params.scope === "revision" || params.revision === "true") {
        return "revision";
    }
    return undefined;
}

export default async function AdminReportsPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const params = await searchParams;
    const isAdmin = user.role === "ADMIN";
    const initialBrand = isAdmin
        ? normalizeStoreBrandFilter(params.brand)
        : "ALL";
    const initialStatus = normalizeStatus(params.status);
    const initialPjumStatus = normalizePjumStatus(params.pjumStatus);
    const scopedBranches =
        isAdmin
            ? null
            : user.branchNames.filter((branchName) => branchName.trim() !== "");
    const requestedBranchName = params.branchName?.trim() || undefined;
    const areaOptions = user.areaNames
        .map((areaName) => areaName.trim())
        .filter((areaName) => areaName.length > 0);
    const requestedAreaName = params.areaName?.trim() || undefined;
    const initialAreaName =
        requestedAreaName && areaOptions.includes(requestedAreaName)
            ? requestedAreaName
            : undefined;
    const initialBranchName =
        scopedBranches === null
            ? requestedBranchName
            : requestedBranchName && scopedBranches.includes(requestedBranchName)
              ? requestedBranchName
              : undefined;
    const initialScope = normalizeScope(params);
    const initialFromDate = params.fromDate?.trim() || undefined;
    const initialToDate = params.toDate?.trim() || undefined;

    const [branches, initialReports] = await Promise.all([
        scopedBranches === null ? fetchAllBranchNames() : scopedBranches,
        getAdminReports(null, 20, {
            status: initialStatus,
            scope: initialScope,
            pjumStatus: initialPjumStatus,
            branchName: initialBranchName,
            areaName: initialAreaName,
            brand: initialBrand,
            fromDate: initialFromDate,
            toDate: initialToDate,
        }),
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Laporan Maintenance"
            breadcrumbs={[{ label: "Laporan Maintenance" }]}
            headerActions={
                <ExportReportsDialog
                    branches={branches}
                    showBranchFilter={isAdmin}
                    showBrandFilter={isAdmin}
                />
            }
            contentClassName="h-full flex flex-col p-0 gap-0 overflow-hidden"
        >
            <Tabs defaultValue="active" className="flex flex-col h-full">
                <div className="bg-background border-b px-4 lg:px-6">
                    <TabsList variant="line" className="h-12 w-full justify-start gap-6 bg-transparent p-0">
                        <TabsTrigger 
                            value="active" 
                            className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                        >
                            Laporan Aktif
                        </TabsTrigger>
                        <TabsTrigger 
                            value="deleted" 
                            className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                        >
                            History Dihapus
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="active" className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                    <AdminReportsTable
                        initialData={initialReports.reports}
                        initialNextCursor={initialReports.nextCursor}
                        initialTotalCount={initialReports.totalCount}
                        branches={branches}
                        areaNames={areaOptions}
                        initialStatus={initialStatus ?? "all"}
                        initialScope={initialScope ?? "all"}
                        initialPjumStatus={initialPjumStatus ?? "all"}
                        initialBranchName={initialBranchName ?? "all"}
                        initialAreaName={initialAreaName ?? "all"}
                        initialBrand={initialBrand}
                        initialFromDate={initialFromDate}
                        initialToDate={initialToDate}
                        showBrandFilter={isAdmin}
                    />
                </TabsContent>
                
                <TabsContent value="deleted" className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                    <DeletedReportsTable />
                </TabsContent>
            </Tabs>
        </AdminDashboardShell>
    );
}
