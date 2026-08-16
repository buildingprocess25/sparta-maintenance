import { requireRole } from "@/lib/authorization";
import { getStoresByBranch } from "@/app/reports/actions";
import { loadMaterialNames } from "@/lib/material-master.server";
import CreateReportForm from "./create-form";

export default async function CreateReportPage({
    searchParams,
}: {
    searchParams: Promise<{ restore?: string }>;
}) {
    const user = await requireRole("BMS");
    const { restore } = await searchParams;
    const autoRestoreOnMount = restore === "1";

    const [stores, materialNames] = await Promise.all([
        getStoresByBranch(user.branchNames[0] || ""),
        loadMaterialNames(),
    ]);

    return (
        <CreateReportForm
            stores={stores}
            materialNames={materialNames}
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
