import { requireAuth } from "@/lib/authorization";
import { getBmcPjumHistory, getPjumBmsUsers } from "./actions";
import { getPendingPjumExports } from "./approval-actions";
import { PjumView } from "./_components/pjum-view";
import { PjumApprovalList } from "./_components/pjum-approval-list";

export const metadata = {
    title: "PJUM — SPARTA Maintenance",
};

export default async function PjumPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requireAuth("/reports/pjum");
    const params = await searchParams;

    // BNM_MANAGER → Approval list
    if (user.role === "BNM_MANAGER") {
        const search =
            typeof params.search === "string" ? params.search : undefined;
        const dateRange =
            typeof params.dateRange === "string" ? params.dateRange : undefined;
        const page = Math.max(
            1,
            typeof params.page === "string" ? Number(params.page) || 1 : 1,
        );

        const result = await getPendingPjumExports({
            search,
            dateRange,
            page,
            limit: 10,
        });
        const items = result.data ?? [];
        const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

        return (
            <PjumApprovalList
                items={items}
                total={result.total}
                currentPage={result.page}
                totalPages={totalPages}
            />
        );
    }

    // BMC → Create PJUM view
    if (user.role === "BMC") {
        const [bmsUsers, historyItems] = await Promise.all([
            getPjumBmsUsers(user.branchNames),
            getBmcPjumHistory(),
        ]);
        return <PjumView bmsUsers={bmsUsers} historyItems={historyItems} />;
    }

    // Other roles: redirect or show nothing
    return null;
}
