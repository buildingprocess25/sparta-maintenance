import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";
import { ARCHIVED_PREVENTIVE_STATUS } from "@/lib/report-status";
import { parseMaterialStores } from "@/lib/report-material-stores";
import { parseStartWorkPhotoUrls } from "@/lib/report-start-work-revision";
import type {
    MaterialEstimationJson,
    ReportItemJson,
} from "@/types/report";
import { ReportDetailView } from "./report-detail-view";
import type { ActivityEntry, ReportData } from "./_components/types";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function ReportDetailPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const { reportNumber } = await params;

    if (user.role !== "BMS") {
        redirect(`/dashboard/reports/${reportNumber}`);
    }

    const report = await getBmsReportDetail(reportNumber, user.NIK);
    if (!report) notFound();

    return (
        <ReportDetailView
            report={report}
            viewer={{ role: user.role, nik: user.NIK }}
        />
    );
}

async function getBmsReportDetail(
    reportNumber: string,
    bmsNIK: string,
): Promise<ReportData | null> {
    const report = await prisma.report.findFirst({
        where: {
            reportNumber,
            createdByNIK: bmsNIK,
            status: { not: ARCHIVED_PREVENTIVE_STATUS },
        },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            branchName: true,
            status: true,
            totalEstimation: true,
            createdAt: true,
            updatedAt: true,
            items: true,
            estimations: true,
            startSelfieUrl: true,
            startReceiptUrls: true,
            startMaterialStores: true,
            completionAdditionalPhotos: true,
            completionAdditionalNote: true,
            unexpectedCostNotes: true,
            completedPdfPath: true,
            reportFinalDriveUrl: true,
            createdBy: {
                select: {
                    name: true,
                    NIK: true,
                },
            },
            activities: {
                orderBy: { createdAt: "asc" },
                select: {
                    action: true,
                    notes: true,
                    createdAt: true,
                    actor: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!report) return null;

    return {
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode ?? "",
        branchName: report.branchName,
        status: report.status,
        totalEstimation: toNumber(report.totalEstimation),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        submittedBy: report.createdBy.name || report.createdBy.NIK,
        items: parseReportItems(report.items),
        estimations: parseEstimations(report.estimations),
        activities: report.activities.map(
            (activity): ActivityEntry => ({
                action: activity.action,
                notes: activity.notes,
                actorName: activity.actor.name,
                createdAt: activity.createdAt,
            }),
        ),
        startSelfieUrls: parseStartWorkPhotoUrls(report.startSelfieUrl),
        startReceiptUrls: parseStartWorkPhotoUrls(report.startReceiptUrls),
        startMaterialStores: parseMaterialStores(report.startMaterialStores),
        completionAdditionalPhotos: parseStartWorkPhotoUrls(
            report.completionAdditionalPhotos,
        ),
        completionAdditionalNote: report.completionAdditionalNote,
        unexpectedCostNotes: report.unexpectedCostNotes,
        completedPdfPath: report.reportFinalDriveUrl ?? report.completedPdfPath,
    };
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
        return Array.isArray(parsed)
            ? (parsed as MaterialEstimationJson[])
            : [];
    } catch {
        return [];
    }
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
