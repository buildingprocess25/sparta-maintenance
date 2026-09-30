-- CreateTable
CREATE TABLE "DeletedReport" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "storeCode" TEXT,
    "storeName" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "totalEstimation" DECIMAL(15,2) NOT NULL,
    "totalReal" DECIMAL(15,2),
    "lastStatus" TEXT NOT NULL,
    "deletedByNIK" TEXT NOT NULL,
    "deletedByName" TEXT NOT NULL,
    "deleteReason" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalData" JSONB NOT NULL,

    CONSTRAINT "DeletedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeletedReport_reportNumber_key" ON "DeletedReport"("reportNumber");

-- CreateIndex
CREATE INDEX "DeletedReport_deletedAt_idx" ON "DeletedReport"("deletedAt");

-- CreateIndex
CREATE INDEX "DeletedReport_storeCode_idx" ON "DeletedReport"("storeCode");

-- CreateIndex
CREATE INDEX "DeletedReport_deletedByNIK_idx" ON "DeletedReport"("deletedByNIK");
