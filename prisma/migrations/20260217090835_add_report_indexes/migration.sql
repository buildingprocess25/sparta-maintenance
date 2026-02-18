-- CreateIndex
CREATE INDEX "Report_createdById_idx" ON "Report"("createdById");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_storeId_idx" ON "Report"("storeId");

-- CreateIndex
CREATE INDEX "Report_createdById_status_idx" ON "Report"("createdById", "status");

-- CreateIndex
CREATE INDEX "Report_storeId_status_idx" ON "Report"("storeId", "status");
