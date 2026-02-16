import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helper";
import { getStoresByBranch } from "@/app/reports/actions";
import CreateReportForm from "./create-form";

export default async function CreateReportPage() {
    const user = await requireAuth();

    if (!user) {
        redirect("/login");
    }

    // Ambil stores sesuai cabang user
    const stores = await getStoresByBranch(user.branchName || "");

    return (
        <CreateReportForm
            stores={stores}
            userBranchCode=""
            userBranchName={user.branchName || ""}
            userContactNumber=""
        />
    );
}
