import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminBranchOptions } from "../queries";
import { getAdminPjum, getDashboardPjumBmsUsers } from "./actions";
import { AdminPjumTable } from "./_components/admin-pjum-table";
import { CreatePjumDialog } from "./_components/create-pjum-dialog";
import { ExportPjumDialog } from "./_components/export-pjum-dialog";

export const dynamic = "force-dynamic";

type AdminPjumPageProps = {
    searchParams?: Promise<{
        status?: string;
        branchName?: string;
    }>;
};

const VALID_INITIAL_PJUM_STATUS = new Set(["PENDING_APPROVAL", "APPROVED"]);

export default async function AdminPjumPage({
    searchParams,
}: AdminPjumPageProps) {
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
    const initialStatus =
        params?.status && VALID_INITIAL_PJUM_STATUS.has(params.status)
            ? params.status
            : undefined;
    const scopedBranches =
        user.role === "ADMIN"
            ? null
            : user.branchNames.filter((branchName) => branchName.trim() !== "");
    const requestedBranchName = params?.branchName?.trim();
    const initialBranchName =
        scopedBranches === null
            ? requestedBranchName
            : requestedBranchName && scopedBranches.includes(requestedBranchName)
              ? requestedBranchName
              : undefined;
    const initialFilters = {
        ...(initialStatus ? { status: initialStatus } : {}),
        ...(initialBranchName ? { branchName: initialBranchName } : {}),
    };

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
        <AdminDashboardShell
            user={user}
            title="PJUM"
            breadcrumbs={[{ label: "Dokumen PJUM" }]}
            headerActions={
                user.role === "ADMIN" ? (
                    <ExportPjumDialog branches={branches} />
                ) : user.role === "BMC" ? (
                    <CreatePjumDialog bmsUsers={bmsUsers} />
                ) : null
            }
            contentClassName="h-full"
        >
            <AdminPjumTable
                initialData={initialData.pjums}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                initialSummary={initialData.summary}
                initialFilters={initialFilters}
                branches={branches}
            />
        </AdminDashboardShell>
    );
}
