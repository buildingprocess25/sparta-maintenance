ALTER TABLE "Report"
    DROP COLUMN IF EXISTS "pendingEstimationPdfPath",
    DROP COLUMN IF EXISTS "estimationApprovedPdfPath",
    DROP COLUMN IF EXISTS "approvedBmcPdfPath",
    DROP COLUMN IF EXISTS "uploadthingFileKeys";
