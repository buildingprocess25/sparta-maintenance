import { requireRole } from "@/lib/authorization";
import { PjumApprovalDetail } from "../../approval/_components/pjum-approval-detail";

export const metadata = {
    title: "Detail Approval PJUM — SPARTA Maintenance",
};

export default async function PjumApprovalDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireRole("BNM_MANAGER");
    const { id } = await params;
    return <PjumApprovalDetail pjumExportId={id} />;
}
