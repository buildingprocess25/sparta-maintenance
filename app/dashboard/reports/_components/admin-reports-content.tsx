import { AdminReportsTable } from "./admin-reports-table";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminReports } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeletedReportsTable } from "./deleted-reports-table";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export async function AdminReportsContent({
    isAdmin,
    scopedBranches,
    initialStatus,
    initialScope,
    initialPjumStatus,
    initialBranchName,
    initialAreaName,
    initialBrand,
    initialFromDate,
    initialToDate,
    areaOptions,
}: any) {
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

    const activeReportsTable = (
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
    );

    if (!isAdmin) {
        return (
            <div className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                {activeReportsTable}
            </div>
        );
    }

    return (
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
                {activeReportsTable}
            </TabsContent>
            
            <TabsContent value="deleted" className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                <DeletedReportsTable />
            </TabsContent>
        </Tabs>
    );
}
