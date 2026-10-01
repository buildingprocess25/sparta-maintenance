import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { Suspense } from "react";
import { AdminPjumContent } from "./_components/admin-pjum-content";
import { AdminPjumSkeleton } from "./_components/admin-pjum-skeleton";

export const dynamic = "force-dynamic";

type AdminPjumPageProps = {
    searchParams?: Promise<{
        status?: string;
        branchName?: string;
        areaName?: string;
        fromDate?: string;
        toDate?: string;
    }>;
};

const VALID_INITIAL_PJUM_STATUS = new Set(["PENDING_APPROVAL", "APPROVED", "REJECTED"]);

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
    const areaOptions = user.areaNames
        .map((areaName) => areaName.trim())
        .filter((areaName) => areaName.length > 0);
    const requestedAreaName = params?.areaName?.trim();
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
    const initialFromDate = params?.fromDate?.trim() || undefined;
    const initialToDate = params?.toDate?.trim() || undefined;
    const initialFilters = {
        ...(initialStatus ? { status: initialStatus } : {}),
        ...(initialBranchName ? { branchName: initialBranchName } : {}),
        ...(initialAreaName ? { areaName: initialAreaName } : {}),
        ...(initialFromDate ? { fromDate: initialFromDate } : {}),
        ...(initialToDate ? { toDate: initialToDate } : {}),
    };

    return (
        <AdminDashboardShell
            user={user}
            title="PJUM"
            breadcrumbs={[{ label: "Dokumen PJUM" }]}
            contentClassName="h-full p-0 flex flex-col"
        >
            <Suspense fallback={<AdminPjumSkeleton />}>
                <AdminPjumContent 
                    user={user}
                    scopedBranches={scopedBranches}
                    initialFilters={initialFilters}
                    areaOptions={areaOptions}
                />
            </Suspense>
        </AdminDashboardShell>
    );
}
