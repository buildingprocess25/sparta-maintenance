import "server-only";

import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import { parseMaterialStores } from "@/lib/report-material-stores";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

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
} catch {
    // PDF still renders without logos.
}

const stampActions = [
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED",
    "ESTIMATION_REJECTED_REVISION",
    "WORK_APPROVED",
    "WORK_REJECTED_REVISION",
    "FINAL_APPROVED_BNM",
    "FINAL_REJECTED_REVISION_BNM",
];

function formatDate(d: Date) {
    return d.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export async function buildReportPdfBuffer(reportNumber: string): Promise<{
    buffer: Buffer;
    report: {
        reportNumber: string;
        branchName: string;
        storeCode: string | null;
        storeName: string;
        createdByNIK: string;
        createdByName: string;
        status: string;
        updatedAt: Date;
    };
}> {
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
        throw new Error("Report not found");
    }

    const items = (report.items ?? []) as unknown as ReportItemJson[];
    const estimations = (report.estimations ??
        []) as unknown as MaterialEstimationJson[];

    const submittedAt = formatDate(report.createdAt);
    const finishedAt = report.finishedAt
        ? formatDate(report.finishedAt)
        : undefined;

    const stamps = report.activities
        .filter((l) => stampActions.includes(l.action))
        .map((log) => ({
            action: log.action,
            approverName: log.actor?.name ?? undefined,
            approverNIK: log.actor?.NIK ?? undefined,
            approverRole: log.actor?.role ?? undefined,
            approvedAt: formatDate(log.createdAt),
            notes: log.notes ?? undefined,
        }));

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
                              typeof url === "string" && url.trim().length > 0,
                      )
                    : [];
            } catch {
                return [];
            }
        }
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            try {
                const parsed = JSON.parse(trimmed);
                return typeof parsed === "string" && parsed.trim().length > 0
                    ? [parsed]
                    : [];
            } catch {
                return [];
            }
        }
        return trimmed.length > 0 ? [trimmed] : [];
    })();

    const rawReceipts = report.startReceiptUrls;
    const startReceiptUrls: string[] = Array.isArray(rawReceipts)
        ? (rawReceipts as string[])
        : typeof rawReceipts === "string" && rawReceipts.startsWith("[")
          ? (JSON.parse(rawReceipts) as string[])
          : [];
    const startMaterialStores = parseMaterialStores(report.startMaterialStores);

    const rawAdditionalDocs = report.completionAdditionalPhotos;
    const completionAdditionalPhotos: string[] = Array.isArray(
        rawAdditionalDocs,
    )
        ? (rawAdditionalDocs as string[])
        : typeof rawAdditionalDocs === "string" &&
            rawAdditionalDocs.startsWith("[")
          ? (JSON.parse(rawAdditionalDocs) as string[])
          : [];
    const completionAdditionalNote =
        report.completionAdditionalNote ?? undefined;

    const completionLog = report.activities.find(
        (l) =>
            l.action === "COMPLETION_SUBMITTED" ||
            l.action === "RESUBMITTED_WORK",
    );
    const completionNotes = completionLog?.notes ?? undefined;

    const buffer = await generateReportPdf({
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
        alfamartLogoBase64,
        buildingLogoBase64,
        completionSelfieUrls,
        startReceiptUrls,
        startMaterialStores,
        completionNotes,
        completionAdditionalPhotos,
        completionAdditionalNote,
        approval: {
            reportStatus: report.status,
            stamps,
        },
    });

    return {
        buffer,
        report: {
            reportNumber: report.reportNumber,
            branchName: report.branchName,
            storeCode: report.storeCode,
            storeName: report.storeName,
            createdByNIK: report.createdByNIK,
            createdByName: report.createdBy.name,
            status: report.status,
            updatedAt: report.updatedAt,
        },
    };
}
