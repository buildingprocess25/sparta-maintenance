-- AlterTable
ALTER TABLE "PjumExport" ADD COLUMN     "pjumFinalDriveUrl" TEXT,
ADD COLUMN     "pjumPdfPath" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "approvedBmcPdfPath" TEXT,
ADD COLUMN     "completedPdfPath" TEXT,
ADD COLUMN     "estimationApprovedPdfPath" TEXT,
ADD COLUMN     "pdfSnapshotMeta" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pendingEstimationPdfPath" TEXT,
ADD COLUMN     "reportFinalDriveUrl" TEXT;
