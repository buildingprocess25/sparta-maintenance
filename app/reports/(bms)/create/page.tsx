import { requireRole } from "@/lib/authorization";
import {
    getDraft,
    getDraftByReportNumber,
    getStoresByBranch,
} from "@/app/reports/actions";
import { loadMaterialNames } from "@/lib/material-master.server";
import CreateReportForm from "./create-form";

export default async function CreateReportPage({
    searchParams,
}: {
    searchParams: Promise<{
        restore?: string;
        storeCode?: string;
        draft?: string;
    }>;
}) {
    const user = await requireRole("BMS");
    const { restore, storeCode, draft } = await searchParams;
    const autoRestoreOnMount = restore === "1";

    const [stores, materialNames, existingDraft] = await Promise.all([
        getStoresByBranch(user.branchNames[0] || ""),
        loadMaterialNames(),
        autoRestoreOnMount && draft
            ? getDraftByReportNumber(draft)
            : autoRestoreOnMount
              ? getDraft()
              : Promise.resolve(null),
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
            existingDraft={existingDraft}
            autoRestoreOnMount={autoRestoreOnMount}
            initialStoreCode={storeCode}
        />
    );
}
