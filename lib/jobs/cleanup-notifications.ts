import "server-only";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_RETENTION_DAYS = 7;

export type CleanupNotificationsResult = {
    deleted: number;
    threshold: string;
};

function getRetentionDays(): number {
    const raw = process.env.NOTIFICATION_RETENTION_DAYS;
    if (!raw) return DEFAULT_RETENTION_DAYS;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
        logger.warn(
            {
                operation: "cleanupOldNotifications",
                notificationRetentionDays: raw,
            },
            "Invalid NOTIFICATION_RETENTION_DAYS, falling back to default",
        );
        return DEFAULT_RETENTION_DAYS;
    }

    return parsed;
}

export async function cleanupOldNotifications(): Promise<CleanupNotificationsResult> {
    const retentionDays = getRetentionDays();
    const threshold = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    logger.info(
        {
            operation: "cleanupOldNotifications",
            threshold: threshold.toISOString(),
            retentionDays,
        },
        "Starting notification cleanup job",
    );

    const result = await prisma.notification.deleteMany({
        where: { createdAt: { lt: threshold } },
    });

    logger.info(
        {
            operation: "cleanupOldNotifications",
            deleted: result.count,
            threshold: threshold.toISOString(),
        },
        "Notification cleanup job completed",
    );

    return {
        deleted: result.count,
        threshold: threshold.toISOString(),
    };
}
