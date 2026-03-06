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
                activities: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        actor: {
                            select: { name: true, NIK: true, role: true },
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
            timeZone: "Asia/Jakarta",
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

        const formatDate = (d: Date) =>
            d.toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });

        const STAMP_ACTIONS = [
            "ESTIMATION_APPROVED",
            "ESTIMATION_REJECTED",
            "ESTIMATION_REJECTED_REVISION",
            "WORK_APPROVED",
            "WORK_REJECTED_REVISION",
            "FINALIZED",
        ];

        // Build stamps from actual activity log entries that exist,
        // preserving chronological order — stamps are permanent once logged.
        const stamps = report.activities
            .filter((l) => STAMP_ACTIONS.includes(l.action))
            .map((log) => ({
                action: log.action,
                approverName: log.actor?.name ?? undefined,
                approverNIK: log.actor?.NIK ?? undefined,
                approverRole: log.actor?.role ?? undefined,
                approvedAt: formatDate(log.createdAt),
                notes: log.notes ?? undefined,
            }));

        // Parse selfie URLs (stored as single URL or JSON array)
        const rawSelfie = report.completionSelfieUrl;
        const completionSelfieUrls: string[] = rawSelfie
            ? rawSelfie.startsWith("[")
                ? (JSON.parse(rawSelfie) as string[])
                : [rawSelfie]
            : [];

        // Pull completion notes from the activity log
        const completionLog = report.activities.find(
            (l) =>
                l.action === "COMPLETION_SUBMITTED" ||
                l.action === "RESUBMITTED_WORK",
        );
        const completionNotes = completionLog?.notes ?? undefined;

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
            completionSelfieUrls,
            completionNotes,
            approval: {
                reportStatus: report.status,
                stamps,
            },
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
