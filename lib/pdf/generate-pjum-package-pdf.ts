import "server-only";

import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { generatePjumPdf } from "@/lib/pdf/generate-pjum-pdf";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import {
    generatePjumFormPdf,
    type PjumFormData,
    type PumFormData,
} from "@/lib/pdf/generate-pjum-form-pdf";
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

export async function generatePjumPackagePdf(params: {
    reportNumbers: string[];
    bmsNIK: string;
    from: string;
    to: string;
    weekNumber: number;
    requireExported?: boolean;
    requester: {
        NIK: string;
        name: string;
        branchNames: string[];
    };
    /** When provided, the PJUM+PUM form page is inserted after the recap */
    pumData?: {
        pjum: PjumFormData;
        pum: PumFormData;
    };
}) {
    const reports = await prisma.report.findMany({
        where: {
            reportNumber: { in: params.reportNumbers },
            branchName: { in: params.requester.branchNames },
            ...(params.requireExported === false
                ? {}
                : { pjumExportedAt: { not: null } }),
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
        throw new Error("No accessible reports found");
    }

    const bmsUser = await prisma.user.findUnique({
        where: { NIK: params.bmsNIK || reports[0].createdByNIK },
        select: { name: true, NIK: true },
    });

    const exportedAt =
        reports[0].pjumExportedAt?.toISOString() ?? new Date().toISOString();

    const branchName =
        params.requester.branchNames.length === 1
            ? params.requester.branchNames[0]
            : reports[0].branchName;

    const pjumBuffer = await generatePjumPdf({
        bmsName: bmsUser?.name ?? params.bmsNIK,
        bmsNIK: bmsUser?.NIK ?? params.bmsNIK,
        bmcName: params.requester.name,
        bmcNIK: params.requester.NIK,
        branchName,
        from: params.from || reports[0].createdAt.toISOString(),
        to: params.to || reports[reports.length - 1].createdAt.toISOString(),
        exportedAt,
        weekNumber: params.weekNumber,
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

    const fullReports = await prisma.report.findMany({
        where: {
            reportNumber: { in: params.reportNumbers },
            branchName: { in: params.requester.branchNames },
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
                storeName: report.store ? report.store.name : report.storeName,
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

    // Build form PDF if PUM data is available (after BnM Manager approval)
    let formBuffer: Buffer | null = null;
    if (params.pumData) {
        formBuffer = await generatePjumFormPdf(
            params.pumData.pjum,
            params.pumData.pum,
        );
    }

    const merged = await PDFDocument.create();
    // Order: 1. Recap (pjumBuffer) → 2. Form PJUM+PUM (if available) → 3..N Individual reports
    const allBuffers = [
        pjumBuffer,
        ...(formBuffer ? [formBuffer] : []),
        ...reportBuffers,
    ];
    for (const buf of allBuffers) {
        const src = await PDFDocument.load(buf);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
    }

    const fromDate = new Date(
        params.from || reports[0].createdAt.toISOString(),
    );
    const monthName = fromDate.toLocaleString("id-ID", { month: "long" });
    const year = fromDate.getFullYear();

    return {
        buffer: Buffer.from(await merged.save()),
        branchName,
        bmsNIK: bmsUser?.NIK ?? params.bmsNIK,
        monthName,
        year,
        fileName: `PJUM-${bmsUser?.NIK ?? params.bmsNIK}-${params.from || "export"}.pdf`,
    };
}
