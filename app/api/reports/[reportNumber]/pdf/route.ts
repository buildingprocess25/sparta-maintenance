import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import { getAuthUser } from "@/lib/authorization";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { parseMaterialStores } from "@/lib/report-material-stores";

// Load logos once at module initialization — avoids disk I/O on every request
const _assetsDir = path.join(process.cwd(), "public", "assets");
let ALFAMART_LOGO_BASE64 = "";
let BUILDING_LOGO_BASE64 = "";
try {
    ALFAMART_LOGO_BASE64 = fs
        .readFileSync(path.join(_assetsDir, "Alfamart-Emblem-small.png"))
        .toString("base64");
    BUILDING_LOGO_BASE64 = fs
        .readFileSync(path.join(_assetsDir, "Building-Logo.png"))
        .toString("base64");
} catch {
    // PDF will render without logo graphics if assets are missing
}

const IMMUTABLE_STATUSES = new Set(["COMPLETED", "ESTIMATION_REJECTED"]);

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
        const finishedAt = report.finishedAt
            ? report.finishedAt.toLocaleDateString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : undefined;

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

        // Parse selfie URLs — now stored in startSelfieUrl (set at start-work).
        // Format: plain URL (1 photo) or JSON-stringified array (multiple photos).
        const rawSelfie = report.startSelfieUrl;
        const completionSelfieUrls: string[] = (() => {
            if (!rawSelfie) return [];
            const trimmed = rawSelfie.trim();
            if (trimmed === "[]") return [];
            if (trimmed.startsWith("[")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Array.isArray(parsed)
                        ? parsed.filter(
                              (url): url is string =>
                                  typeof url === "string" &&
                                  url.trim().length > 0,
                          )
                        : [];
                } catch {
                    return [];
                }
            }
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return typeof parsed === "string" &&
                        parsed.trim().length > 0
                        ? [parsed]
                        : [];
                } catch {
                    return [];
                }
            }
            return trimmed.length > 0 ? [trimmed] : [];
        })();

        // Parse start-work receipt URLs — stored as JSONB, may come back as a
        // raw JSON string from the DB driver. Handle both forms defensively.
        const rawReceipts = report.startReceiptUrls;
        const startReceiptUrls: string[] = Array.isArray(rawReceipts)
            ? (rawReceipts as string[])
            : typeof rawReceipts === "string" &&
                (rawReceipts as string).startsWith("[")
              ? (JSON.parse(rawReceipts as string) as string[])
              : [];
        const startMaterialStores = parseMaterialStores(
            report.startMaterialStores,
        );

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
            submittedByNIK: report.createdByNIK,
            submittedAt,
            finishedAt,
            items,
            estimations,
            totalEstimation: Number(report.totalEstimation),
            alfamartLogoBase64: ALFAMART_LOGO_BASE64,
            buildingLogoBase64: BUILDING_LOGO_BASE64,
            completionSelfieUrls,
            startReceiptUrls,
            startMaterialStores,
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
                // URL contains ?v={updatedAt} — each version is a unique URL,
                // so caching aggressively here is safe.
                "Cache-Control": "private, max-age=3600, immutable",
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
