ALTER TABLE "Report"
ADD COLUMN "pjumHangingAt" TIMESTAMPTZ(3),
ADD COLUMN "pjumExpiredAt" TIMESTAMPTZ(3);

CREATE INDEX "Report_createdByNIK_pjumHangingAt_pjumExpiredAt_idx"
ON "Report"("createdByNIK", "pjumHangingAt", "pjumExpiredAt");
