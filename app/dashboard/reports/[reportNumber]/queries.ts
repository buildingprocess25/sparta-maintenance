import "server-only";

import prisma from "@/lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { parseMaterialStores } from "@/lib/report-material-stores";
import type {
    MaterialEstimationJson,
    MaterialStoreJson,
    ReportItemJson,
} from "@/types/report";
import {
    buildReportDetailModel,
    parseUrlList,
    type RawReportDetailInput,
    type ReportDetailModel,
} from "./_lib/detail-data";

export async function getAdminReportDetail(
    reportNumber: string,
): Promise<ReportDetailModel | null> {
    const report = await prisma.report.findFirst({
        where: {
            reportNumber,
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        },
        select: {
            reportNumber: true,
            branchName: true,
            storeName: true,
            storeCode: true,
            status: true,
            totalEstimation: true,
            totalReal: true,
            items: true,
            estimations: true,
            startSelfieUrl: true,
            startReceiptUrls: true,
            startMaterialStores: true,
            completionAdditionalPhotos: true,
            completionAdditionalNote: true,
            pendingEstimationPdfPath: true,
            estimationApprovedPdfPath: true,
            approvedBmcPdfPath: true,
            completedPdfPath: true,
            reportFinalDriveUrl: true,
            revisedPdfDriveUrl: true,
            revisedPdfFolderUrl: true,
            finishedAt: true,
            pjumExportedAt: true,
            createdAt: true,
            updatedAt: true,
            createdBy: {
                select: {
                    name: true,
                    NIK: true,
                },
            },
            logs: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    status: true,
                    notes: true,
                    createdAt: true,
                    approver: {
                        select: {
                            name: true,
                            NIK: true,
                            role: true,
                        },
                    },
                },
            },
            activities: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    action: true,
                    notes: true,
                    createdAt: true,
                    actor: {
                        select: {
                            name: true,
                            NIK: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    if (!report) return null;

    const pjumExport = await prisma.pjumExport.findFirst({
        where: { reportNumbers: { has: report.reportNumber } },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            status: true,
            weekNumber: true,
            createdAt: true,
            updatedAt: true,
            approvedAt: true,
            pjumFinalDriveUrl: true,
            pjumPdfPath: true,
        },
    });

    const raw: RawReportDetailInput = {
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode ?? "",
        branchName: report.branchName,
        status: report.status,
        totalEstimation: toNumber(report.totalEstimation),
        totalReal:
            report.totalReal === null ? null : toNumber(report.totalReal),
        createdAt: toIso(report.createdAt),
        updatedAt: toIso(report.updatedAt),
        finishedAt: toNullableIso(report.finishedAt),
        pjumExportedAt: toNullableIso(report.pjumExportedAt),
        submittedBy: {
            name: report.createdBy.name,
            nik: report.createdBy.NIK,
        },
        items: parseReportItems(report.items),
        estimations: parseEstimations(report.estimations),
        startSelfieUrls: parseUrlList(report.startSelfieUrl),
        startReceiptUrls: parseUrlList(report.startReceiptUrls),
        startMaterialStores: parseStartMaterialStores(report.startMaterialStores),
        completionAdditionalPhotos: parseUrlList(
            report.completionAdditionalPhotos,
        ),
        completionAdditionalNote: report.completionAdditionalNote,
        pendingEstimationPdfPath: report.pendingEstimationPdfPath,
        estimationApprovedPdfPath: report.estimationApprovedPdfPath,
        approvedBmcPdfPath: report.approvedBmcPdfPath,
        completedPdfPath: report.completedPdfPath,
        reportFinalDriveUrl: report.reportFinalDriveUrl,
        revisedPdfDriveUrl: report.revisedPdfDriveUrl,
        revisedPdfFolderUrl: report.revisedPdfFolderUrl,
        approvalLogs: report.logs.map((log) => ({
            id: log.id,
            status: log.status,
            notes: log.notes,
            createdAt: toIso(log.createdAt),
            approverName: log.approver.name,
            approverNik: log.approver.NIK,
            approverRole: log.approver.role,
        })),
        activities: report.activities.map((activity) => ({
            id: activity.id,
            action: activity.action,
            notes: activity.notes,
            createdAt: toIso(activity.createdAt),
            actorName: activity.actor.name,
            actorNik: activity.actor.NIK,
            actorRole: activity.actor.role,
        })),
        pjumExport: pjumExport
            ? {
                  id: pjumExport.id,
                  status: pjumExport.status,
                  weekNumber: pjumExport.weekNumber,
                  createdAt: toIso(pjumExport.createdAt),
                  updatedAt: toIso(pjumExport.updatedAt),
                  approvedAt: toNullableIso(pjumExport.approvedAt),
                  pjumFinalDriveUrl: pjumExport.pjumFinalDriveUrl,
                  pjumPdfPath: pjumExport.pjumPdfPath,
              }
            : null,
    };

    return buildReportDetailModel(raw);
}

function parseReportItems(raw: unknown): ReportItemJson[] {
    if (Array.isArray(raw)) return raw as ReportItemJson[];
    if (typeof raw !== "string") return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ReportItemJson[]) : [];
    } catch {
        return [];
    }
}

function parseEstimations(raw: unknown): MaterialEstimationJson[] {
    if (Array.isArray(raw)) return raw as MaterialEstimationJson[];
    if (typeof raw !== "string") return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as MaterialEstimationJson[]) : [];
    } catch {
        return [];
    }
}

function parseStartMaterialStores(raw: unknown): MaterialStoreJson[] {
    return parseMaterialStores(raw);
}

function toIso(value: Date): string {
    return value.toISOString();
}

function toNullableIso(value: Date | null): string | null {
    return value ? value.toISOString() : null;
}

function toNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (
        value &&
        typeof value === "object" &&
        "toNumber" in value &&
        typeof value.toNumber === "function"
    ) {
        const parsed = value.toNumber();
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
