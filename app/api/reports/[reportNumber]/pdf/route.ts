import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/authorization";
import {
    generateAndSaveReportSnapshot,
    resolveReportSnapshotPath,
} from "@/lib/pdf/report-snapshots";
import { downloadPdfSnapshot } from "@/lib/pdf/snapshot-storage";

function resolveCheckpointFromStatus(status: string) {
    if (status === "COMPLETED") return "COMPLETED" as const;
    if (status === "APPROVED_BMC") return "APPROVED_BMC" as const;
    if (status === "ESTIMATION_APPROVED") return "ESTIMATION_APPROVED" as const;
    return "PENDING_ESTIMATION" as const;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ reportNumber: string }> },
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportNumber = (await params).reportNumber;

    try {
        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: {
                reportNumber: true,
                status: true,
                branchName: true,
                createdByNIK: true,
                updatedAt: true,
                pendingEstimationPdfPath: true,
                estimationApprovedPdfPath: true,
                approvedBmcPdfPath: true,
                completedPdfPath: true,
            },
        });

        if (!report) {
            return NextResponse.json(
                { error: "Report not found" },
                { status: 404 },
            );
        }

        // BMS can only access their own reports (including drafts)
        // BMC can only access reports from their branches
        // BNM_MANAGER can only access COMPLETED reports
        // ADMIN has unrestricted access
        if (user.role === "BMS") {
            if (report.createdByNIK !== user.NIK) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 },
                );
            }
        } else if (user.role === "BMC") {
            if (!user.branchNames.includes(report.branchName)) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 },
                );
            }
        } else if (user.role === "BNM_MANAGER") {
            // BNM_MANAGER can only access COMPLETED reports from their own branches
            if (
                report.status !== "COMPLETED" ||
                !user.branchNames.includes(report.branchName)
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 },
                );
            }
        }

        const snapshotPath = resolveReportSnapshotPath(report);
        if (snapshotPath) {
            const snapshotBuffer = await downloadPdfSnapshot(snapshotPath);
            if (snapshotBuffer) {
                return new NextResponse(snapshotBuffer as unknown as BodyInit, {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `inline; filename="${reportNumber}.pdf"`,
                        "Cache-Control": "private, max-age=3600, immutable",
                        "X-PDF-Source": "snapshot",
                    },
                });
            }
        }

        const checkpoint = resolveCheckpointFromStatus(report.status);
        const generated = await generateAndSaveReportSnapshot({
            reportNumber,
            checkpoint,
        });

        return new NextResponse(generated.buffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${reportNumber}.pdf"`,
                "Cache-Control": "private, max-age=3600, immutable",
                "X-PDF-Source": "generated",
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
