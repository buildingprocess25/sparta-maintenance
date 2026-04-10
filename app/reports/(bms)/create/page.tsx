import { requireRole } from "@/lib/authorization";
import { getStoresByBranch, getDraft } from "@/app/reports/actions";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import CreateReportForm from "./create-form";

export default async function CreateReportPage({
    searchParams,
}: {
    searchParams: Promise<{ restore?: string }>;
}) {
    const user = await requireRole("BMS");
    const { restore } = await searchParams;
    const autoRestoreOnMount = restore === "1";

    // Fetch stores
    const [stores] = await Promise.all([
        getStoresByBranch(user.branchNames[0] || ""),
    ]);

    return (
        <CreateReportForm
            stores={stores}
            userBranchName={user.branchNames[0] || ""}
            userInfo={{
                name: user.name,
                nik: user.NIK,
                role: user.role,
                branch: user.branchNames[0] || "",
            }}
            existingDraft={undefined} // No longer pulled from DB for DRAFT
            autoRestoreOnMount={autoRestoreOnMount}
        />
    );
}
