import { requireRole } from "@/lib/authorization";
import { getStoresByBranch, getDraft } from "@/app/reports/actions";
import type { ReportItemJson } from "@/types/report";
import CreateReportForm from "./create-form";

export default async function CreateReportPage() {
    const user = await requireRole("BMS");

    // Fetch stores and draft in parallel
    const [stores, draft] = await Promise.all([
        getStoresByBranch(user.branchName || ""),
        getDraft(),
    ]);

    // Serialize draft for client component
    // items is now a Json column (plain array), not a Prisma relation
    const draftItems = (draft?.items ?? []) as unknown as ReportItemJson[];

    const serializedDraft = draft
        ? {
              reportNumber: draft.reportNumber,
              storeName: draft.storeName,
              storeCode: draft.storeCode || "",
              branchName: draft.branchName,
              totalEstimation: Number(draft.totalEstimation),
              updatedAt: draft.updatedAt.toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
              }),
              items: draftItems.map((item) => ({
                  itemId: item.itemId,
                  itemName: item.itemName,
                  categoryName: item.categoryName,
                  condition: item.condition,
                  preventiveCondition: item.preventiveCondition,
                  handler: item.handler,
                  photoUrl: item.photoUrl ?? null,
                  images: item.images ?? [],
                  notes: item.notes ?? null,
              })),
          }
        : null;

    return (
        <CreateReportForm
            stores={stores}
            userBranchName={user.branchName || ""}
            existingDraft={serializedDraft}
        />
    );
}
