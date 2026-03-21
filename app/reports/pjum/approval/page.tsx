import { requireRole } from "@/lib/authorization";
import { PjumApprovalList } from "./_components/pjum-approval-list";

export const metadata = {
    title: "Approval PJUM — SPARTA Maintenance",
};

export default async function PjumApprovalPage() {
    await requireRole("BNM_MANAGER");
    return <PjumApprovalList />;
}
