import { requireAuth } from "@/lib/authorization";
import {
    getBMSActivity,
    getBranchActivity,
    getGlobalActivity,
} from "@/app/dashboard/queries";
import { ActivityList } from "./_components/activity-list";

const PER_PAGE = 20;
const POOL = 500;

type Props = {
    searchParams: Promise<{
        page?: string;
        search?: string;
        action?: string;
    }>;
};

export default async function ActivityPage({ searchParams }: Props) {
    const user = await requireAuth();
    const { page: pageParam, search, action } = await searchParams;

    let all;
    switch (user.role) {
        case "BMS":
            all = await getBMSActivity(user.NIK, POOL);
            break;
        case "BMC":
        case "BNM_MANAGER":
            all = await getBranchActivity(user.branchNames, POOL);
            break;
        case "ADMIN":
        default:
            all = await getGlobalActivity(POOL);
            break;
    }

    // Filter in memory
    let filtered = all;

    if (action && action !== "all") {
        filtered = filtered.filter((item) => item.action === action);
    }

    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
            (item) =>
                item.reportNumber.toLowerCase().includes(q) ||
                item.report.storeName?.toLowerCase().includes(q) ||
                item.report.branchName.toLowerCase().includes(q) ||
                item.actor.name.toLowerCase().includes(q),
        );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.min(
        Math.max(1, Number(pageParam) || 1),
        totalPages,
    );
    const activities = filtered.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE,
    );

    return (
        <ActivityList
            activities={activities}
            total={total}
            totalPages={totalPages}
            currentPage={currentPage}
        />
    );
}
