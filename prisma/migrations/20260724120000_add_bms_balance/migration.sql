-- CreateEnum
CREATE TYPE "BmsBalancePeriodStatus" AS ENUM ('ACTIVE', 'LOCKED_PJUM', 'CLOSED');

-- CreateTable
CREATE TABLE "BmsBalancePeriod" (
    "id" TEXT NOT NULL,
    "bmsNIK" TEXT NOT NULL,
    "initialBalance" DECIMAL(15,2) NOT NULL DEFAULT 1000000,
    "status" "BmsBalancePeriodStatus" NOT NULL DEFAULT 'ACTIVE',
    "pjumExportId" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BmsBalancePeriod_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "balancePeriodId" TEXT;
ALTER TABLE "Report" ADD COLUMN "unexpectedCostNotes" TEXT;

-- CreateIndex
CREATE INDEX "BmsBalancePeriod_bmsNIK_createdAt_idx" ON "BmsBalancePeriod"("bmsNIK", "createdAt");

-- CreateIndex
CREATE INDEX "BmsBalancePeriod_bmsNIK_status_idx" ON "BmsBalancePeriod"("bmsNIK", "status");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_balancePeriodId_fkey" FOREIGN KEY ("balancePeriodId") REFERENCES "BmsBalancePeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
