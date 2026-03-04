import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { ReportDetailView } from "./report-detail-view";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function ReportDetailPage({ params }: Props) {
    const { reportNumber } = await params;
    const user = await requireAuth(`/reports/${reportNumber}`);

    const report = await prisma.report.findUnique({
        where: { reportNumber },
        include: {
            createdBy: { select: { NIK: true, name: true } },
            activities: {
                orderBy: { createdAt: "asc" },
                include: { actor: { select: { name: true } } },
            },
        },
    });

    if (!report) notFound();

    // Access control
    if (user.role === "BMS") {
        // BMS can only view their own reports
        if (report.createdByNIK !== user.NIK) redirect("/reports");
    } else if (user.role === "BMC") {
        // BMC can view reports from their branches
        if (!user.branchNames.includes(report.branchName)) redirect("/reports");
    } else if (user.role === "BNM_MANAGER") {
        // BnM Manager can view APPROVED_BMC and COMPLETED reports
        if (!["APPROVED_BMC", "COMPLETED"].includes(report.status))
            redirect("/reports");
    } else if (user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const items = (report.items ?? []) as unknown as ReportItemJson[];
    const estimations = (report.estimations ??
        []) as unknown as MaterialEstimationJson[];

    return (
        <ReportDetailView
            report={{
                reportNumber: report.reportNumber,
                storeName: report.storeName,
                storeCode: report.storeCode || "",
                branchName: report.branchName,
                status: report.status as string,
                totalEstimation: Number(report.totalEstimation),
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                submittedBy: report.createdBy.name,
                items,
                estimations,
                activities: report.activities.map((a) => ({
                    action: a.action as string,
                    notes: a.notes ?? null,
                    actorName: a.actor.name,
                    createdAt: a.createdAt,
                })),
            }}
            viewer={{ role: user.role, nik: user.NIK }}
        />
    );
}
