import { requireAuth } from "@/lib/authorization";
import { getMyReports } from "@/app/reports/actions";
import BmsReportsList from "./_components/bms-reports-list";
import { BmcApprovalList } from "./_components/bmc-approval-list";
import type { DateRangeFilter } from "./actions/types";

type ReportsPageProps = {
    searchParams: Promise<{
        // BMS params
        page?: string;
        search?: string;
        // Approval params
        q?: string;
        // Shared
        status?: string;
        dateRange?: string;
    }>;
};

export default async function ReportsPage(props: ReportsPageProps) {
    const user = await requireAuth("/reports");
    const searchParams = await props.searchParams;

    // ── BMC / BNM_MANAGER / ADMIN → Approval queue ──────────────────────────
    if (["BMC", "BNM_MANAGER", "ADMIN"].includes(user.role)) {
        return (
            <BmcApprovalList
                user={{ role: user.role, branchNames: user.branchNames }}
                q={searchParams.q}
                status={searchParams.status}
                dateRange={searchParams.dateRange}
            />
        );
    }

    // ── BMS → Personal report list ───────────────────────────────────────────
    const page = Number(searchParams.page) || 1;
    const limit = 10;
    const search = searchParams.search || "";
    const status = searchParams.status || "all";
    const dateRange = searchParams.dateRange || "all";

    const { reports, total } = await getMyReports({
        page,
        limit,
        search,
        status: status === "all" ? undefined : status.toUpperCase(),
        dateRange: dateRange as DateRangeFilter,
    });

    const totalPages = Math.ceil(total / limit);

    // Serialize Prisma Decimal to plain number for client component
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
    }));

    return (
        <BmsReportsList
            reports={serializedReports}
            total={total}
            totalPages={totalPages}
            currentPage={page}
        />
    );
}
