import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminBranchOptions } from "../queries";
import { getAdminPjum } from "./actions";
import { AdminPjumTable } from "./_components/admin-pjum-table";
import { ExportPjumDialog } from "./_components/export-pjum-dialog";

export const dynamic = "force-dynamic";

type AdminPjumPageProps = {
    searchParams?: Promise<{
        status?: string;
    }>;
};

const VALID_INITIAL_PJUM_STATUS = new Set(["PENDING_APPROVAL", "APPROVED"]);

export default async function AdminPjumPage({
    searchParams,
}: AdminPjumPageProps) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const params = await searchParams;
    const initialStatus =
        params?.status && VALID_INITIAL_PJUM_STATUS.has(params.status)
            ? params.status
            : undefined;
    const initialFilters = initialStatus ? { status: initialStatus } : {};

    const [branchOptions, initialData] = await Promise.all([
        getAdminBranchOptions(),
        getAdminPjum(null, 20, initialFilters),
    ]);
    const branches = branchOptions.map((branch) => branch.name);

    return (
        <AdminDashboardShell
            user={user}
            title="PJUM"
            breadcrumbs={[{ label: "Dokumen PJUM" }]}
            headerActions={<ExportPjumDialog branches={branches} />}
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
