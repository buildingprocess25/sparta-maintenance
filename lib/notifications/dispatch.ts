import "server-only";

import { NotificationType, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildNotificationTemplate } from "./templates";
import { getBmsRecipient, getBranchRecipients } from "./recipients";
import { sendPushToRecipients } from "./push";
import type { NotificationEventInput, NotificationRecipient } from "./types";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export async function dispatchNotificationEvent(input: NotificationEventInput) {
    try {
        if ("reportNumber" in input) {
            await dispatchReportNotification(input);
            return;
        }

        await dispatchPjumNotification(input);
    } catch (error) {
        logger.warn(
            {
                operation: "dispatchNotificationEvent",
                type: input.type,
                errorMessage: getErrorMessage(error),
            },
            "Notification dispatch failed",
        );
    }
}

async function dispatchReportNotification(
    input: Extract<NotificationEventInput, { reportNumber: string }>,
) {
    const report = await prisma.report.findUnique({
        where: { reportNumber: input.reportNumber },
        select: {
            reportNumber: true,
            storeCode: true,
            storeName: true,
            branchName: true,
            createdByNIK: true,
        },
    });

    if (!report) return;

    const recipients = await getReportRecipients(input.type, report);
    await createAndPushNotifications({
        type: input.type,
        actorNIK: input.actorNIK,
        recipients,
        report,
        notes: "notes" in input ? input.notes : null,
    });
}

async function dispatchPjumNotification(
    input: Extract<NotificationEventInput, { pjumExportId: string }>,
) {
    const pjum = await prisma.pjumExport.findUnique({
        where: { id: input.pjumExportId },
        select: {
            id: true,
            bmsNIK: true,
            branchName: true,
            weekNumber: true,
            reportNumbers: true,
            createdByNIK: true,
        },
    });

    if (!pjum) return;

    const recipients = await getPjumRecipients(input.type, pjum);
    await createAndPushNotifications({
        type: input.type,
        actorNIK: input.actorNIK,
        recipients,
        pjum,
        notes: input.notes,
    });
}

async function getReportRecipients(
    type: NotificationType,
    report: { branchName: string; createdByNIK: string },
): Promise<NotificationRecipient[]> {
    switch (type) {
        case "REPORT_SUBMITTED":
        case "REPORT_WORK_STARTED":
        case "REPORT_COMPLETION_SUBMITTED":
            return getBranchRecipients({
                branchName: report.branchName,
                role: UserRole.BMC,
            });
        case "REPORT_WORK_APPROVED":
            return getBranchRecipients({
                branchName: report.branchName,
                role: UserRole.BNM_MANAGER,
            });
        case "REPORT_FINAL_APPROVED":
        case "REPORT_FINAL_REJECTED_REVISION": {
            const bms = await getBmsRecipient(report.createdByNIK);
            const bmc = await getBranchRecipients({
                branchName: report.branchName,
                role: UserRole.BMC,
            });
            return [...bms, ...bmc];
        }
        case "REPORT_INTERVENTION_CREATED": {
            const bms = await getBmsRecipient(report.createdByNIK);
            const bmc = await getBranchRecipients({
                branchName: report.branchName,
                role: UserRole.BMC,
            });
            const bnm = await getBranchRecipients({
                branchName: report.branchName,
                role: UserRole.BNM_MANAGER,
            });
            return [...bms, ...bmc, ...bnm];
        }
        default:
            return getBmsRecipient(report.createdByNIK);
    }
}

async function getPjumRecipients(
    type: NotificationType,
    pjum: { bmsNIK: string; branchName: string; createdByNIK: string },
): Promise<NotificationRecipient[]> {
    if (type === "PJUM_CREATED") {
        return getBranchRecipients({
            branchName: pjum.branchName,
            role: UserRole.BNM_MANAGER,
        });
    }

    const bms = await getBmsRecipient(pjum.bmsNIK);
    const creator = await prisma.user.findUnique({
        where: { NIK: pjum.createdByNIK },
        select: { NIK: true, role: true, deletedAt: true },
    });

    const recipients = [...bms];
    if (creator && !creator.deletedAt && creator.role === UserRole.BMC) {
        recipients.push({ NIK: creator.NIK, role: creator.role });
    }
    return recipients;
}

async function createAndPushNotifications(params: {
    type: NotificationType;
    actorNIK: string;
    recipients: NotificationRecipient[];
    report?: {
        reportNumber: string;
        storeCode: string | null;
        storeName: string;
        branchName: string;
        createdByNIK: string;
    };
    pjum?: {
        id: string;
        bmsNIK: string;
        branchName: string;
        weekNumber: number;
        reportNumbers: string[];
    };
    notes?: string | null;
}) {
    const uniqueRecipients = Array.from(
        new Map(
            params.recipients.map((recipient) => [recipient.NIK, recipient]),
        ).values(),
    ).filter((recipient) => recipient.NIK !== params.actorNIK);

    for (const recipient of uniqueRecipients) {
        const template = buildNotificationTemplate({
            type: params.type,
            actorNIK: params.actorNIK,
            recipientRole: recipient.role,
            report: params.report,
            pjum: params.pjum,
            notes: params.notes,
        });

        const notification = await prisma.notification.create({
            data: {
                recipientNIK: recipient.NIK,
                actorNIK: params.actorNIK,
                type: template.type,
                title: template.title,
                body: template.body,
                href: template.href,
                entityType: template.entityType,
                entityId: template.entityId,
                reportNumber: template.reportNumber,
                pjumExportId: template.pjumExportId,
                metadata: template.metadata,
            },
            select: {
                id: true,
                title: true,
                body: true,
                href: true,
                type: true,
            },
        });

        await sendPushToRecipients({
            recipientNIKs: [recipient.NIK],
            payload: {
                notificationId: notification.id,
                title: notification.title,
                body: notification.body,
                href: notification.href,
                type: notification.type,
            },
        });
    }
}
