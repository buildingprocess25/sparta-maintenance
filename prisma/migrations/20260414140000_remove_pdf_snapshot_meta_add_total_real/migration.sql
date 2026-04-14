-- Drop legacy PDF snapshot metadata column (unused in application logic)
ALTER TABLE "Report" DROP COLUMN "pdfSnapshotMeta";

-- Persist total realisasi per report
ALTER TABLE "Report" ADD COLUMN "totalReal" DECIMAL(15,2);
