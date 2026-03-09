import { requireRole } from "@/lib/authorization";
import { getBMCApprovalHistory } from "@/app/dashboard/queries";
import { BmcHistoryList } from "./_components/bmc-history-list";

const PER_PAGE = 20;

type Props = {
    searchParams: Promise<{
        page?: string;
        search?: string;
        action?: string;
    }>;
};

export default async function BmcHistoryPage({ searchParams }: Props) {
    const user = await requireRole("BMC");
    const { page: pageParam, search, action } = await searchParams;

    let all = await getBMCApprovalHistory(user.NIK);

    // Filter in memory
    if (action && action !== "all") {
        all = all.filter((item) => item.action === action);
    }

    if (search) {
        const q = search.toLowerCase();
        all = all.filter(
            (item) =>
                item.reportNumber.toLowerCase().includes(q) ||
                item.report.storeName?.toLowerCase().includes(q) ||
                item.report.branchName.toLowerCase().includes(q),
        );
    }

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.min(
        Math.max(1, Number(pageParam) || 1),
        totalPages,
    );
    const activities = all.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE,
    );

    return (
        <BmcHistoryList
            activities={activities}
            total={total}
            totalPages={totalPages}
            currentPage={currentPage}
        />
    );
}
