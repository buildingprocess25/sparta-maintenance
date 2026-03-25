import { requireRole } from "@/lib/authorization";
import { notFound } from "next/navigation";
import {
    getPjumExportDetail,
    getBmsBankAccounts,
} from "../approval-actions";
import { PjumApprovalDetail } from "../_components/pjum-approval-detail";

export const metadata = {
    title: "Detail PJUM — SPARTA Maintenance",
};

export default async function PjumDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireRole("BNM_MANAGER");
    const { id } = await params;

    const result = await getPjumExportDetail(id);
    if (result.error || !result.data) {
        notFound();
    }

    const bankResult = await getBmsBankAccounts(result.data.bmsNIK);

    return (
        <PjumApprovalDetail
            detail={result.data}
            bankAccounts={bankResult.data}
        />
    );
}
