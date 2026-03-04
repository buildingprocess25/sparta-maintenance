import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getStoresByBranch } from "@/app/reports/actions";
import prisma from "@/lib/prisma";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import CreateReportForm from "@/app/reports/(bms)/create/create-form";

export default async function EditReportPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: reportNumber } = await params;
    const user = await requireRole("BMS");

    const report = await prisma.report.findUnique({
        where: { reportNumber },
        select: {
            reportNumber: true,
            storeCode: true,
            storeName: true,
            branchName: true,
            totalEstimation: true,
            status: true,
            createdByNIK: true,
            items: true,
            estimations: true,
            updatedAt: true,
            store: { select: { code: true, name: true } },
        },
    });

    // Draft: redirect to create page with ?restore=1 to auto-restore without dialog
    if (!report || report.status === "DRAFT") {
        redirect("/reports/create?restore=1");
    }

    // Only ESTIMATION_REJECTED_REVISION reports owned by this user can be edited
    if (
        report.status !== "ESTIMATION_REJECTED_REVISION" ||
        report.createdByNIK !== user.NIK
    ) {
        redirect("/reports");
    }

    const [stores] = await Promise.all([
        getStoresByBranch(user.branchNames[0] || ""),
    ]);

    const items = (report.items ?? []) as unknown as ReportItemJson[];
    const estimations = (report.estimations ??
        []) as unknown as MaterialEstimationJson[];

    const serializedReport = {
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode || "",
        branchName: report.branchName,
        totalEstimation: Number(report.totalEstimation),
        updatedAt: report.updatedAt.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }),
        items: items.map((item) => ({
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
        estimations: estimations.map((est) => ({
            itemId: est.itemId,
            materialName: est.materialName,
            quantity: est.quantity,
            unit: est.unit,
            price: est.price,
            totalPrice: est.totalPrice,
        })),
    };

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
            existingDraft={serializedReport}
            editMode={{ reportNumber: report.reportNumber }}
        />
    );
}
