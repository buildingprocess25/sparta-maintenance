import { requireRole } from "@/lib/authorization";
import { getStoresByBranch, getDraft } from "@/app/reports/actions";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import CreateReportForm from "./create-form";

export default async function CreateReportPage() {
    const user = await requireRole("BMS");

    // Fetch stores and draft in parallel
    const [stores, draft] = await Promise.all([
        getStoresByBranch(user.branchNames[0] || ""),
        getDraft(),
    ]);

    // Serialize draft for client component
    // items is now a Json column (plain array), not a Prisma relation
    const draftItems = (draft?.items ?? []) as unknown as ReportItemJson[];
    const draftEstimations = (draft?.estimations ??
        []) as unknown as MaterialEstimationJson[];

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
              estimations: draftEstimations.map((est) => ({
                  itemId: est.itemId,
                  materialName: est.materialName,
                  quantity: est.quantity,
                  unit: est.unit,
                  price: est.price,
                  totalPrice: est.totalPrice,
              })),
          }
        : null;

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
            existingDraft={serializedDraft}
        />
    );
}
