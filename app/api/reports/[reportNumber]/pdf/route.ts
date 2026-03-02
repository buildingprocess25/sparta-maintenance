import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ reportNumber: string }> },
) {
    const reportNumber = (await params).reportNumber;

    try {
        const report = await prisma.report.findUnique({
            where: { reportNumber },
            include: {
                createdBy: {
                    select: { name: true },
                },
                store: {
                    select: { name: true, code: true },
                },
                logs: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        approver: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!report) {
            return NextResponse.json(
                { error: "Report not found" },
                { status: 404 },
            );
        }

        const items = (report.items ?? []) as unknown as ReportItemJson[];
        const estimations = (report.estimations ??
            []) as unknown as MaterialEstimationJson[];

        const submittedAt = report.createdAt.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        const assetsDir = path.join(process.cwd(), "public", "assets");

        let alfamartLogoBase64 = "";
        let buildingLogoBase64 = "";

        try {
            alfamartLogoBase64 = fs
                .readFileSync(path.join(assetsDir, "Alfamart-Emblem-small.png"))
                .toString("base64");
            buildingLogoBase64 = fs
                .readFileSync(path.join(assetsDir, "Building-Logo.png"))
                .toString("base64");
        } catch (e) {
            logger.error(
                { operation: "generatePdf", reportNumber },
                "Failed to load logo assets",
                e,
            );
            // Fallback to empty string or a placeholder if needed,
            // but generateReportPdf might rely on them.
            // We'll proceed, assuming they exist as checked in previous steps.
        }

        // Determine approval status from the latest log or report status
        const approvalData = {
            status: "PENDING" as "PENDING" | "APPROVED" | "REJECTED",
            approvedBy: undefined as string | undefined,
            approvedAt: undefined as string | undefined,
            notes: undefined as string | undefined,
        };

        if (
            report.status === "APPROVED_BMC" ||
            report.status === "COMPLETED"
        ) {
            // If completed/approved by BMC, find the relevant approval log.
            const latestLog = report.logs[0];

            // All these statuses mean work was approved
            approvalData.status = "APPROVED";

            // Hydrate details from log if available
            if (latestLog) {
                if (
                    latestLog.status === "APPROVED_BMC" ||
                    latestLog.status === "COMPLETED"
                ) {
                    approvalData.approvedBy = latestLog.approver.name;
                    approvalData.approvedAt =
                        latestLog.createdAt.toLocaleDateString("id-ID", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                    approvalData.notes = latestLog.notes || undefined;
                }
            }
        } else if (
            report.status === "ESTIMATION_REJECTED" ||
            report.status === "ESTIMATION_REJECTED_REVISION" ||
            report.status === "REVIEW_REJECTED_REVISION"
        ) {
            approvalData.status = "REJECTED";
            const latestLog = report.logs[0];
            if (latestLog) {
                approvalData.approvedBy = latestLog.approver.name;
                approvalData.approvedAt = latestLog.createdAt.toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                approvalData.notes = latestLog.notes || undefined;
            }
        }

        const pdfBuffer = await generateReportPdf({
            reportNumber: report.reportNumber,
            storeName: report.store ? report.store.name : report.storeName,
            storeCode: report.store ? report.store.code : "-",
            branchName: report.branchName,
            submittedBy: report.createdBy.name,
            submittedAt,
            items,
            estimations,
            totalEstimation: Number(report.totalEstimation),
            alfamartLogoBase64,
            buildingLogoBase64,
            approval: approvalData,
        });

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${reportNumber}.pdf"`,
            },
        });
    } catch (error) {
        logger.error(
            { operation: "generatePdf", reportNumber },
            "Failed to generate PDF",
            error,
        );
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 },
        );
    }
}
