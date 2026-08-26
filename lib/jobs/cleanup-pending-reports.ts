import { logger } from "@/lib/logger";

const DEFAULT_PENDING_EXPIRY_DAYS = 14;

export type CleanupPendingReportsResult = {
  cutoffDate: string;
  reportsFound: number;
  reportsDeleted: number;
  photosDeleted: number;
  failedReports: string[];
};

type CleanupCandidateReport = {
  reportNumber: string;
  status: string;
  drivePhotoFileIds?: unknown;
};

type CleanupPendingReportsDeps = {
  now(): Date;
  getPendingExpiryDays(): number;
  findExpiredReports(cutoffDate: Date): Promise<CleanupCandidateReport[]>;
  deleteReportWithLogs(reportNumber: string): Promise<void>;
  deleteDriveFile(fileId: string): Promise<void>;
};

export function createCleanupPendingReportsJob(
  deps: CleanupPendingReportsDeps,
) {
  return async function cleanupPendingReportsJob(): Promise<CleanupPendingReportsResult> {
    const cutoffDate = deps.now();
    cutoffDate.setDate(cutoffDate.getDate() - deps.getPendingExpiryDays());

    const reportsToDelete = await deps.findExpiredReports(cutoffDate);
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
        const drivePhotoFileIds = normalizeDrivePhotoFileIds(
          report.drivePhotoFileIds,
        );

        for (const fileId of drivePhotoFileIds) {
          await deps.deleteDriveFile(fileId);
          result.photosDeleted += 1;
        }

        await deps.deleteReportWithLogs(report.reportNumber);
        result.reportsDeleted += 1;
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
  };
}

export async function cleanupPendingReports(): Promise<CleanupPendingReportsResult> {
  const [{ default: prisma }, { deletePhotoFromDriveCdn }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/storage/drive-photo-service"),
  ]);

  return createCleanupPendingReportsJob({
    now: () => new Date(),
    getPendingExpiryDays,
    findExpiredReports: (cutoffDate) =>
      prisma.report.findMany({
        where: {
          status: { in: ["PENDING_ESTIMATION", "DRAFT"] },
          createdAt: { lt: cutoffDate },
        },
        select: {
          reportNumber: true,
          status: true,
          drivePhotoFileIds: true,
        },
      }),
    deleteReportWithLogs: async (reportNumber) => {
      await prisma.$transaction([
        prisma.activityLog.deleteMany({
          where: { reportNumber },
        }),
        prisma.approvalLog.deleteMany({
          where: { reportNumber },
        }),
        prisma.report.delete({
          where: { reportNumber },
        }),
      ]);
    },
    deleteDriveFile: async (fileId) => {
      const deleted = await deletePhotoFromDriveCdn(fileId);
      if (!deleted) {
        throw new Error(`Failed to delete Drive photo ${fileId}`);
      }
    },
  })();
}

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

function normalizeDrivePhotoFileIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
}
