import "server-only";

import prisma from "@/lib/prisma";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { ReportItemJson } from "@/types/report";

const DEFAULT_PENDING_EXPIRY_DAYS = 14;
const STORAGE_DELETE_BATCH_SIZE = 100;

type ParsedStoragePath = {
    bucket: string;
    objectPath: string;
};

export type CleanupPendingReportsResult = {
    cutoffDate: string;
    reportsFound: number;
    reportsDeleted: number;
    photosDeleted: number;
    failedReports: string[];
};

function getPendingExpiryDays(): number {
    const raw = process.env.CLEANUP_PENDING_EXPIRY_DAYS;
    if (!raw) return DEFAULT_PENDING_EXPIRY_DAYS;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
        logger.warn(
            {
                operation: "cleanupPendingReports",
                cleanupPendingExpiryDays: raw,
            },
            "Invalid CLEANUP_PENDING_EXPIRY_DAYS, falling back to default",
        );
        return DEFAULT_PENDING_EXPIRY_DAYS;
    }

    return parsed;
}

function extractPhotoUrls(reportItems: unknown): string[] {
    const urls: string[] = [];
    if (!reportItems) return urls;

    try {
        const items = (reportItems as ReportItemJson[] | null) ?? [];
        for (const item of items) {
            if (item.images && Array.isArray(item.images)) {
                urls.push(...item.images);
            }
            if (item.photoUrl && typeof item.photoUrl === "string") {
                urls.push(item.photoUrl);
            }
            if (item.afterImages && Array.isArray(item.afterImages)) {
                urls.push(...item.afterImages);
            }
            if (item.receiptImages && Array.isArray(item.receiptImages)) {
                urls.push(...item.receiptImages);
            }
        }
    } catch {
        logger.warn(
            { operation: "cleanupPendingReports.extractPhotoUrls" },
            "Failed to parse report items while collecting photos",
        );
    }

    return urls;
}

function parseStoragePath(url: string): ParsedStoragePath | null {
    try {
        const parsed = new URL(url);
        const marker = "/storage/v1/object/public/";
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex < 0) return null;

        const remainder = parsed.pathname.slice(markerIndex + marker.length);
        const [bucket, ...pathParts] = remainder.split("/");
        if (!bucket || pathParts.length === 0) return null;

        const objectPath = decodeURIComponent(pathParts.join("/"));
        if (!objectPath) return null;

        return { bucket, objectPath };
    } catch {
        return null;
    }
}

async function deletePhotosFromSupabase(urls: string[]): Promise<number> {
    if (urls.length === 0) return 0;

    const grouped = new Map<string, Set<string>>();

    for (const rawUrl of urls) {
        if (!rawUrl) continue;
        const parsed = parseStoragePath(rawUrl);
        if (!parsed) continue;

        const existing = grouped.get(parsed.bucket) ?? new Set<string>();
        existing.add(parsed.objectPath);
        grouped.set(parsed.bucket, existing);
    }

    if (grouped.size === 0) return 0;

    const supabase = getSupabaseClient();
    let deletedCount = 0;

    for (const [bucket, objectPathSet] of grouped.entries()) {
        const objectPaths = Array.from(objectPathSet);

        for (let i = 0; i < objectPaths.length; i += STORAGE_DELETE_BATCH_SIZE) {
            const batch = objectPaths.slice(i, i + STORAGE_DELETE_BATCH_SIZE);
            const { error } = await supabase.storage.from(bucket).remove(batch);

            if (error) {
                logger.warn(
                    {
                        operation: "cleanupPendingReports.deletePhotos",
                        bucket,
                        batchSize: batch.length,
                    },
                    `Failed deleting storage objects: ${error.message}`,
                );
            } else {
                deletedCount += batch.length;
            }
        }
    }

    return deletedCount;
}

function extractStartSelfieUrls(rawSelfie: string | null): string[] {
    if (!rawSelfie) return [];
    if (rawSelfie.startsWith("[")) {
        try {
            const parsed = JSON.parse(rawSelfie);
            return Array.isArray(parsed)
                ? parsed.filter(
                      (url): url is string =>
                          typeof url === "string" && url.length > 0,
                  )
                : [];
        } catch {
            return [];
        }
    }
    return rawSelfie.trim() ? [rawSelfie] : [];
}

export async function cleanupPendingReports(): Promise<CleanupPendingReportsResult> {
    const pendingExpiryDays = getPendingExpiryDays();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - pendingExpiryDays);

    const reportsToDelete = await prisma.report.findMany({
        where: {
            status: "PENDING_ESTIMATION",
            createdAt: { lt: cutoffDate },
        },
        select: {
            reportNumber: true,
            items: true,
            startSelfieUrl: true,
            startReceiptUrls: true,
        },
    });

    const result: CleanupPendingReportsResult = {
        cutoffDate: cutoffDate.toISOString(),
        reportsFound: reportsToDelete.length,
        reportsDeleted: 0,
        photosDeleted: 0,
        failedReports: [],
    };

    logger.info(
        {
            operation: "cleanupPendingReports",
            cutoffDate: result.cutoffDate,
            reportsFound: result.reportsFound,
        },
        "Starting pending-report cleanup job",
    );

    for (const report of reportsToDelete) {
        try {
            const photoUrls: string[] = [];
            photoUrls.push(...extractPhotoUrls(report.items));
            photoUrls.push(...extractStartSelfieUrls(report.startSelfieUrl));
            if (Array.isArray(report.startReceiptUrls)) {
                photoUrls.push(
                    ...(report.startReceiptUrls as string[]).filter(Boolean),
                );
            }

            const deletedPhotos = await deletePhotosFromSupabase(photoUrls);

            await prisma.$transaction([
                prisma.activityLog.deleteMany({
                    where: { reportNumber: report.reportNumber },
                }),
                prisma.approvalLog.deleteMany({
                    where: { reportNumber: report.reportNumber },
                }),
                prisma.report.delete({
                    where: { reportNumber: report.reportNumber },
                }),
            ]);

            result.reportsDeleted += 1;
            result.photosDeleted += deletedPhotos;
        } catch (error) {
            result.failedReports.push(report.reportNumber);
            logger.error(
                {
                    operation: "cleanupPendingReports",
                    reportNumber: report.reportNumber,
                },
                "Failed to cleanup pending report",
                error,
            );
        }
    }

    logger.info(
        {
            operation: "cleanupPendingReports",
            ...result,
        },
        "Pending-report cleanup job completed",
    );

    return result;
}
