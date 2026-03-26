/**
 * Cleanup script: Delete PENDING_ESTIMATION reports older than 2 weeks
 * Removes report records, photos from Supabase, and related data
 *
 * Run manually:
 *   npx tsx scripts/cleanup-pending-reports.ts
 *
 * Or schedule with cron (e.g., daily at 2 AM):
 *   0 2 * * * cd /path/to/sparta-maintenance && npm run cleanup:pending
 */

import prisma from "@/lib/prisma";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { ReportItemJson } from "@/types/report";

const PENDING_EXPIRY_DAYS = 14; // 2 weeks

async function extractPhotoUrls(reportItems: unknown): Promise<string[]> {
    const urls: string[] = [];
    if (!reportItems) return urls;

    try {
        const items = (reportItems as ReportItemJson[] | null) ?? [];
        for (const item of items) {
            // Collect images/photoUrl from items
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
            { operation: "extractPhotoUrls" },
            "Failed to extract photo URLs",
        );
    }
    return urls;
}

async function deletePhotosFromSupabase(urls: string[]): Promise<number> {
    if (urls.length === 0) return 0;

    try {
        const supabase = getSupabaseClient();
        let deleted = 0;

        for (const url of urls) {
            if (!url) continue;

            // Extract path from Supabase URL
            // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file
            const match = url.match(/\/public\/[^/]+\/(.+)$/);
            if (!match) continue;

            const fullPath = match[1];
            const bucket = "report-photos"; // Assuming bucket name

            try {
                const { error } = await supabase.storage
                    .from(bucket)
                    .remove([fullPath]);

                if (error) {
                    logger.warn(
                        { operation: "deletePhotoFromSupabase", fullPath },
                        "Failed to delete photo",
                    );
                } else {
                    deleted++;
                }
            } catch {
                logger.warn(
                    { operation: "deletePhotoFromSupabase", fullPath },
                    "Exception deleting photo",
                );
            }
        }

        return deleted;
    } catch (e) {
        logger.error(
            { operation: "deletePhotosFromSupabase" },
            "Failed to delete photos",
            e,
        );
        return 0;
    }
}

async function cleanupPendingReports(): Promise<void> {
    try {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - PENDING_EXPIRY_DAYS);

        logger.info(
            {
                operation: "cleanupPendingReports",
                expiryDate: expiryDate.toISOString(),
            },
            "Starting cleanup of pending reports",
        );

        // Find reports to delete
        const reportsToDelete = await prisma.report.findMany({
            where: {
                status: "PENDING_ESTIMATION",
                createdAt: { lt: expiryDate },
            },
            select: {
                reportNumber: true,
                createdAt: true,
                items: true,
                startSelfieUrl: true,
                startReceiptUrls: true,
            },
        });

        if (reportsToDelete.length === 0) {
            logger.info(
                { operation: "cleanupPendingReports" },
                "No reports to delete",
            );
            return;
        }

        logger.info(
            {
                operation: "cleanupPendingReports",
                count: reportsToDelete.length,
            },
            `Found ${reportsToDelete.length} reports to delete`,
        );

        let totalPhotosDeleted = 0;
        let totalReportsDeleted = 0;

        for (const report of reportsToDelete) {
            try {
                // Collect all photo URLs
                const photoUrls: string[] = [];

                // From items
                const itemPhotos = await extractPhotoUrls(report.items);
                photoUrls.push(...itemPhotos);

                // From start work
                if (
                    report.startSelfieUrl &&
                    typeof report.startSelfieUrl === "string"
                ) {
                    if (report.startSelfieUrl.startsWith("[")) {
                        photoUrls.push(
                            ...(JSON.parse(report.startSelfieUrl) as string[]),
                        );
                    } else {
                        photoUrls.push(report.startSelfieUrl);
                    }
                }

                if (
                    report.startReceiptUrls &&
                    Array.isArray(report.startReceiptUrls)
                ) {
                    photoUrls.push(...(report.startReceiptUrls as string[]));
                }

                // Delete photos
                const photosDeleted = await deletePhotosFromSupabase(photoUrls);
                totalPhotosDeleted += photosDeleted;

                // Delete report record
                await prisma.report.delete({
                    where: { reportNumber: report.reportNumber },
                });

                totalReportsDeleted++;

                logger.info(
                    {
                        operation: "cleanupPendingReports",
                        reportNumber: report.reportNumber,
                        photosDeleted,
                    },
                    "Deleted old pending report and associated photos",
                );
            } catch {
                logger.error(
                    {
                        operation: "cleanupPendingReports",
                        reportNumber: report.reportNumber,
                    },
                    "Failed to delete report",
                );
            }
        }

        logger.info(
            {
                operation: "cleanupPendingReports",
                reportsDeleted: totalReportsDeleted,
                photosDeleted: totalPhotosDeleted,
            },
            "Cleanup completed",
        );
    } catch (e) {
        logger.error({ operation: "cleanupPendingReports" }, "Cleanup failed");
        throw e;
    }
}

// Run cleanup
cleanupPendingReports()
    .then(() => {
        console.log("✅ Cleanup completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    });
