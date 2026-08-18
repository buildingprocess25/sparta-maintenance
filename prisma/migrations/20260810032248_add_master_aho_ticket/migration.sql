-- DropIndex
DROP INDEX "PjumExport_reportNumbers_gin_idx";

-- DropIndex
DROP INDEX "Report_reportNumber_pattern_idx";

-- DropIndex
DROP INDEX "Store_code_trgm_idx";

-- DropIndex
DROP INDEX "Store_name_trgm_idx";

-- DropIndex
DROP INDEX "User_branchNames_gin_idx";

-- AlterTable
ALTER TABLE "AppSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "MasterAhoTicket" (
    "id" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "problemNo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MasterAhoTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasterAhoTicket_storeCode_idx" ON "MasterAhoTicket"("storeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAhoTicket_storeCode_problemNo_key" ON "MasterAhoTicket"("storeCode", "problemNo");

-- AddForeignKey
ALTER TABLE "MasterAhoTicket" ADD CONSTRAINT "MasterAhoTicket_storeCode_fkey" FOREIGN KEY ("storeCode") REFERENCES "Store"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
