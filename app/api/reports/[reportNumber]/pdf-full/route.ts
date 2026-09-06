import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/authorization";
import {
    generateAndSaveFullReportSnapshot,
    resolveFullReportSnapshotUrl,
} from "@/lib/pdf/report-snapshots";

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
                fullPdfDriveUrl: true,
            },
        });

        if (!report) {
            return NextResponse.json(
                { error: "Report not found" },
                { status: 404 },
            );
        }

        // Same access control as the standard PDF route
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

        if (report.status !== "COMPLETED") {
            return NextResponse.json(
                { error: "PDF hanya tersedia setelah laporan selesai" },
                { status: 404 },
            );
        }

        // If the full PDF has already been generated, redirect to the Drive URL
        const existingUrl = resolveFullReportSnapshotUrl(report);
        if (existingUrl) {
            return NextResponse.redirect(existingUrl);
        }

        // First time: generate, upload to Drive, cache URL in DB, serve buffer
        const { buffer } = await generateAndSaveFullReportSnapshot(reportNumber);

        return new NextResponse(buffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${reportNumber}_full.pdf"`,
                "Cache-Control": "private, max-age=3600, immutable",
                "X-PDF-Source": "generated",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "generateFullPdf", reportNumber },
            "Failed to generate full PDF",
            error,
        );
        return NextResponse.json(
            { error: "Failed to generate full PDF" },
            { status: 500 },
        );
    }
}
