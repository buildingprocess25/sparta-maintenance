import { requireAuth } from "@/lib/authorization";
import {
    getBMSActivity,
    getBranchActivity,
    getGlobalActivity,
    getPjumActivity,
} from "@/app/dashboard/queries";
import { ActivityList } from "./_components/activity-list";
import { PjumActivityList } from "./_components/pjum-activity-list";

const PER_PAGE = 20;
const POOL = 500;

type Props = {
    searchParams: Promise<{
        page?: string;
        search?: string;
        action?: string;
        date?: string;
    }>;
};

export default async function ActivityPage({ searchParams }: Props) {
    const user = await requireAuth();
    const { page: pageParam, search, action, date } = await searchParams;

    if (user.role === "BNM_MANAGER") {
        const allPjum = await getPjumActivity(user.branchNames, POOL);
        let filteredPjum = allPjum;

        if (action && action !== "all") {
            filteredPjum = filteredPjum.filter(
                (item) => item.action === action,
            );
        }

        if (date) {
            const filterDate = new Date(date);
            filteredPjum = filteredPjum.filter((item) => {
                const itemDate = new Date(item.createdAt);
                return (
                    itemDate.getFullYear() === filterDate.getFullYear() &&
                    itemDate.getMonth() === filterDate.getMonth() &&
                    itemDate.getDate() === filterDate.getDate()
                );
            });
        }

        const totalPjum = filteredPjum.length;
        const totalPagesPjum = Math.max(1, Math.ceil(totalPjum / PER_PAGE));
        const currentPagePjum = Math.min(
            Math.max(1, Number(pageParam) || 1),
            totalPagesPjum,
        );
        const activitiesPjum = filteredPjum.slice(
            (currentPagePjum - 1) * PER_PAGE,
            currentPagePjum * PER_PAGE,
        );

        return (
            <PjumActivityList
                activities={activitiesPjum}
                total={totalPjum}
                totalPages={totalPagesPjum}
                currentPage={currentPagePjum}
            />
        );
    }

    let all;
    switch (user.role) {
        case "BMS":
            all = await getBMSActivity(user.NIK, POOL);
            break;
        case "BMC":
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
