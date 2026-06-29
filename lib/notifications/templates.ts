import { UserRole } from "@prisma/client";
import type { NotificationTemplate, NotificationTemplateContext } from "./types";

function reportHref(role: UserRole, reportNumber: string) {
    return role === UserRole.BMS
        ? `/reports/${reportNumber}`
        : `/dashboard/reports/${reportNumber}`;
}

function reportLabel(report: NonNullable<NotificationTemplateContext["report"]>) {
    return `${report.reportNumber} - ${report.storeName || report.storeCode || "Toko"}`;
}

export function buildNotificationTemplate(
    context: NotificationTemplateContext,
): NotificationTemplate {
    if (context.report) {
        const report = context.report;
        const base = {
            type: context.type,
            href: reportHref(context.recipientRole, report.reportNumber),
            entityType: "REPORT" as const,
            entityId: report.reportNumber,
            reportNumber: report.reportNumber,
            pjumExportId: null,
            metadata: {
                branchName: report.branchName,
                storeCode: report.storeCode,
                actorNIK: context.actorNIK,
            },
        };

        switch (context.type) {
            case "REPORT_SUBMITTED":
                return {
                    ...base,
                    title: "Laporan baru menunggu review estimasi",
                    body: `${reportLabel(report)} perlu dicek oleh BMC.`,
                };
            case "REPORT_ESTIMATION_APPROVED":
                return {
                    ...base,
                    title: "Estimasi disetujui",
                    body: `${reportLabel(report)} sudah disetujui. BMS boleh mulai pekerjaan.`,
                };
            case "REPORT_ESTIMATION_REJECTED_REVISION":
                return {
                    ...base,
                    title: "Estimasi perlu direvisi",
                    body: `${reportLabel(report)} dikembalikan untuk revisi. Buka laporan untuk melihat catatan.`,
                };
            case "REPORT_ESTIMATION_REJECTED":
                return {
                    ...base,
                    title: "Estimasi ditolak",
                    body: `${reportLabel(report)} ditolak permanen oleh BMC.`,
                };
            case "REPORT_COMPLETION_SUBMITTED":
                return {
                    ...base,
                    title: "Penyelesaian menunggu review",
                    body: `${reportLabel(report)} perlu dicek dengan nota dan foto pekerjaan.`,
                };
            case "REPORT_WORK_STARTED":
                return {
                    ...base,
                    title: "Pekerjaan dimulai",
                    body: `${reportLabel(report)} sudah mulai dikerjakan oleh BMS.`,
                };
            case "REPORT_WORK_APPROVED":
                return {
                    ...base,
                    title: "Pekerjaan disetujui BMC",
                    body: `${reportLabel(report)} sudah diteruskan ke BNM untuk approval final.`,
                };
            case "REPORT_WORK_REJECTED_REVISION":
                return {
                    ...base,
                    title: "Pekerjaan perlu direvisi",
                    body: `${reportLabel(report)} dikembalikan oleh BMC. Buka laporan untuk melihat catatan.`,
                };
            case "REPORT_FINAL_APPROVED":
                return {
                    ...base,
                    title: "Laporan selesai final",
                    body: `${reportLabel(report)} sudah disetujui final oleh BNM.`,
                };
            case "REPORT_FINAL_REJECTED_REVISION":
                return {
                    ...base,
                    title: "Approval final dikembalikan",
                    body: `${reportLabel(report)} dikembalikan oleh BNM. Buka laporan untuk melihat catatan.`,
                };
            case "REPORT_INTERVENTION_CREATED":
                return {
                    ...base,
                    title: "Ada intervensi laporan selesai",
                    body: `${reportLabel(report)} mendapat koreksi dari Admin setelah status selesai.`,
                };
        }
    }

    if (context.pjum) {
        const pjum = context.pjum;
        const reportCount = pjum.reportNumbers.length;
        const base = {
            type: context.type,
            href: `/dashboard/pjum/${pjum.id}`,
            entityType: "PJUM" as const,
            entityId: pjum.id,
            reportNumber: null,
            pjumExportId: pjum.id,
            metadata: {
                branchName: pjum.branchName,
                bmsNIK: pjum.bmsNIK,
                weekNumber: pjum.weekNumber,
                actorNIK: context.actorNIK,
            },
        };

        switch (context.type) {
            case "PJUM_CREATED":
                return {
                    ...base,
                    title: "PJUM menunggu approval",
                    body: `PJUM minggu ${pjum.weekNumber} berisi ${reportCount} laporan perlu dicek oleh BNM.`,
                };
            case "PJUM_APPROVED":
                return {
                    ...base,
                    title: "PJUM disetujui",
                    body: `PJUM minggu ${pjum.weekNumber} berisi ${reportCount} laporan sudah disetujui BNM.`,
                };
            case "PJUM_REJECTED":
                return {
                    ...base,
                    title: "PJUM ditolak",
                    body: `PJUM minggu ${pjum.weekNumber} dikembalikan. Buka detail PJUM untuk melihat catatan.`,
                };
        }
    }

    throw new Error(`Unsupported notification template: ${context.type}`);
}
