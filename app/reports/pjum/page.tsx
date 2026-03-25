import { requireAuth } from "@/lib/authorization";
import { getPjumBmsUsers } from "./actions";
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
        const search = typeof params.search === "string" ? params.search : undefined;
        const dateRange = typeof params.dateRange === "string" ? params.dateRange : undefined;
        
        const result = await getPendingPjumExports({ search, dateRange });
        const items = result.data ?? [];
        return <PjumApprovalList items={items} />;
    }

    // BMC → Create PJUM view
    if (user.role === "BMC") {
        const bmsUsers = await getPjumBmsUsers(user.branchNames);
        return <PjumView bmsUsers={bmsUsers} />;
    }

    // Other roles: redirect or show nothing
    return null;
}
