import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generatePjumPdf } from "@/lib/pdf/generate-pjum-pdf";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import { getAuthUser } from "@/lib/authorization";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { PDFDocument } from "pdf-lib";

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
    // Render without logo if assets are missing
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== "BMC") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const idsParam = sp.get("ids");
    const bmsNIK = sp.get("bmsNIK") ?? "";
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";

    if (!idsParam) {
        return NextResponse.json(
            { error: "Missing ids parameter" },
            { status: 400 },
        );
    }

    const reportNumbers = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (reportNumbers.length === 0) {
        return NextResponse.json(
            { error: "No report IDs provided" },
            { status: 400 },
        );
    }

    try {
        const reports = await prisma.report.findMany({
            where: {
                reportNumber: { in: reportNumbers },
                branchName: { in: user.branchNames },
                // Only allow PDF generation for reports that have been PJUM-exported
                pjumExportedAt: { not: null },
            },
            select: {
                reportNumber: true,
                createdAt: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                totalEstimation: true,
                createdByNIK: true,
                createdBy: { select: { name: true } },
                pjumExportedAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        if (reports.length === 0) {
            return NextResponse.json(
                { error: "No accessible reports found" },
                { status: 404 },
            );
        }

        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK || reports[0].createdByNIK },
            select: { name: true, NIK: true },
        });

        const exportedAt =
            reports[0].pjumExportedAt?.toISOString() ??
            new Date().toISOString();

        const branchName =
            user.branchNames.length === 1
                ? user.branchNames[0]
                : reports[0].branchName;

        const pjumBuffer = await generatePjumPdf({
            bmsName: bmsUser?.name ?? bmsNIK,
            bmsNIK: bmsUser?.NIK ?? bmsNIK,
            bmcName: user.name,
            bmcNIK: user.NIK,
            branchName,
            from: from || reports[0].createdAt.toISOString(),
            to: to || reports[reports.length - 1].createdAt.toISOString(),
            exportedAt,
            reports: reports.map((r) => ({
                reportNumber: r.reportNumber,
                createdAt: r.createdAt.toISOString(),
                storeName: r.storeName,
                storeCode: r.storeCode,
                branchName: r.branchName,
                status: r.status as string,
                totalEstimation: Number(r.totalEstimation),
            })),
        });

        // Fetch full report data for appendix pages
        const fullReports = await prisma.report.findMany({
            where: {
                reportNumber: { in: reportNumbers },
                branchName: { in: user.branchNames },
            },
            include: {
                createdBy: { select: { name: true } },
                store: { select: { name: true, code: true } },
                activities: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        actor: {
                            select: { name: true, NIK: true, role: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        const STAMP_ACTIONS = [
            "ESTIMATION_APPROVED",
            "ESTIMATION_REJECTED",
            "ESTIMATION_REJECTED_REVISION",
            "WORK_APPROVED",
            "WORK_REJECTED_REVISION",
            "FINALIZED",
        ];

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

        const reportBuffers = await Promise.all(
            fullReports.map(async (report) => {
                const items = (report.items ??
                    []) as unknown as ReportItemJson[];
                const estimations = (report.estimations ??
                    []) as unknown as MaterialEstimationJson[];

                const submittedAt = report.createdAt.toLocaleDateString(
                    "id-ID",
                    {
                        timeZone: "Asia/Jakarta",
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    },
                );

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

                const rawSelfie = report.startSelfieUrl;
                const completionSelfieUrls: string[] = rawSelfie
                    ? rawSelfie.startsWith("[")
                        ? (JSON.parse(rawSelfie) as string[])
                        : [rawSelfie]
                    : [];

                const rawReceipts = report.startReceiptUrls;
                const startReceiptUrls: string[] = Array.isArray(rawReceipts)
                    ? (rawReceipts as string[])
                    : typeof rawReceipts === "string" &&
                        (rawReceipts as string).startsWith("[")
                      ? (JSON.parse(rawReceipts as string) as string[])
                      : [];

                const completionLog = report.activities.find(
                    (l) =>
                        l.action === "COMPLETION_SUBMITTED" ||
                        l.action === "RESUBMITTED_WORK",
                );
                const completionNotes = completionLog?.notes ?? undefined;

                return generateReportPdf({
                    reportNumber: report.reportNumber,
                    storeName: report.store
                        ? report.store.name
                        : report.storeName,
                    storeCode: report.store ? report.store.code : "-",
                    branchName: report.branchName,
                    submittedBy: report.createdBy.name,
                    submittedByNIK: report.createdByNIK,
                    submittedAt,
                    items,
                    estimations,
                    totalEstimation: Number(report.totalEstimation),
                    alfamartLogoBase64: ALFAMART_LOGO_BASE64,
                    buildingLogoBase64: BUILDING_LOGO_BASE64,
                    completionSelfieUrls,
                    startReceiptUrls,
                    completionNotes,
                    approval: {
                        reportStatus: report.status,
                        stamps,
                    },
                });
            }),
        );

        // Merge cover + all individual report PDFs
        const merged = await PDFDocument.create();
        for (const buf of [pjumBuffer, ...reportBuffers]) {
            const src = await PDFDocument.load(buf);
            const pages = await merged.copyPages(src, src.getPageIndices());
            pages.forEach((p) => merged.addPage(p));
        }
        const mergedBuffer = Buffer.from(await merged.save());

        const fileName = `PJUM-${bmsUser?.NIK ?? bmsNIK}-${from || "export"}.pdf`;

        return new NextResponse(mergedBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "generatePjumPdf", bmsNIK },
            "Failed to generate PJUM PDF",
            error,
        );
        return NextResponse.json(
            { error: "Failed to generate PJUM PDF" },
            { status: 500 },
        );
    }
}
