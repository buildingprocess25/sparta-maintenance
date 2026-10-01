import { getAdminBranchOptions } from "../../queries";
import { getAdminPjum, getDashboardPjumBmsUsers } from "../actions";
import { AdminPjumTable } from "./admin-pjum-table";
import { CreatePjumDialog } from "./create-pjum-dialog";
import { ExportPjumDialog } from "./export-pjum-dialog";

export async function AdminPjumContent({
    user,
    scopedBranches,
    initialFilters,
    areaOptions,
}: any) {
    const [branchOptions, initialData, bmsUsers] = await Promise.all([
        scopedBranches === null ? getAdminBranchOptions() : [],
        getAdminPjum(null, 20, initialFilters),
        user.role === "BMC" ? getDashboardPjumBmsUsers() : [],
    ]);
    
    const branches =
        scopedBranches === null
            ? branchOptions.map((branch) => branch.name)
            : scopedBranches;

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-end gap-2 px-4 lg:px-6 pt-4 lg:pt-6">
                {user.role === "BMC" ? (
                    <>
                        <CreatePjumDialog bmsUsers={bmsUsers} />
                        <ExportPjumDialog
                            branches={branches}
                            showBranchFilter={false}
                        />
                    </>
                ) : (
                    <ExportPjumDialog
                        branches={branches}
                        showBranchFilter={user.role === "ADMIN"}
                    />
                )}
            </div>
            <AdminPjumTable
                initialData={initialData.pjums}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                initialSummary={initialData.summary}
                initialFilters={initialFilters}
                branches={branches}
                areaNames={areaOptions}
            />
        </div>
    );
}
