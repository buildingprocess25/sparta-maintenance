ALTER TABLE "User" ADD COLUMN "areaNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Store" ADD COLUMN "areaName" TEXT;
CREATE INDEX "Store_areaName_idx" ON "Store"("areaName");
CREATE INDEX "Store_branchName_areaName_idx" ON "Store"("branchName", "areaName");

ALTER TABLE "Report" ADD COLUMN "areaName" TEXT;
CREATE INDEX "Report_branchName_areaName_status_idx" ON "Report"("branchName", "areaName", "status");

ALTER TABLE "PjumExport" ADD COLUMN "areaNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "PjumExport_areaNames_idx" ON "PjumExport" USING GIN ("areaNames");
