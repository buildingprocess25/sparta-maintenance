import { requireAuth } from "@/lib/authorization";
import { getMyReports, getApprovalReports } from "@/app/reports/actions";
import BmsReportsList from "./_components/bms-reports-list";
import { ApprovalReportsList } from "./_components/approval-reports-list";
import type { DateRangeFilter } from "./actions/types";

type ReportsPageProps = {
    searchParams: Promise<{
        // BMS params
        page?: string;
        search?: string;
        // Approval params
        bms?: string;   // filter by BMS reporter name
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
        const approvalPage = Number(searchParams.page) || 1;
        const approvalLimit = 10;
        const approvalSearch = searchParams.search || "";
        const approvalBms = searchParams.bms || "";
        const approvalStatus = searchParams.status || "all";
        const approvalDateRange = searchParams.dateRange || "all";

        const { reports, total } = await getApprovalReports({
            status: approvalStatus,
            search: approvalSearch,
            bms: approvalBms,
            dateRange: approvalDateRange as DateRangeFilter,
            page: approvalPage,
            limit: approvalLimit,
        });

        return (
            <ApprovalReportsList
                reports={reports}
                total={total}
                totalPages={Math.ceil(total / approvalLimit)}
                currentPage={approvalPage}
                role={user.role}
            />
        );
    }

    // ── BMS → Personal report list ───────────────────────────────────────────
    const page = Number(searchParams.page) || 1;
    const limit = 10;
    const search = searchParams.search || "";
    const rawStatus = searchParams.status || "all";
    const dateRange = searchParams.dateRange || "all";

    // Group filters: map dashboard stat-card params to arrays of statuses
    const BMS_NEEDS_ACTION = [
        "ESTIMATION_APPROVED",
        "ESTIMATION_REJECTED_REVISION",
        "REVIEW_REJECTED_REVISION",
    ];
    const BMS_WAITING_REVIEW = [
        "PENDING_ESTIMATION",
        "PENDING_REVIEW",
        "APPROVED_BMC",
    ];
    const resolvedStatus: string | string[] | undefined =
        rawStatus === "all"
            ? undefined
            : rawStatus === "needs_action"
              ? BMS_NEEDS_ACTION
              : rawStatus === "waiting_review"
                ? BMS_WAITING_REVIEW
                : rawStatus.toUpperCase();

    const { reports, total } = await getMyReports({
        page,
        limit,
        search,
        status: resolvedStatus,
        dateRange: dateRange as DateRangeFilter,
    });

    const totalPages = Math.ceil(total / limit);

    // Serialize Prisma Decimal to plain number for client component
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
        totalRealisasi: Number(r.totalRealisasi ?? 0),
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
