-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ActivityAction" AS ENUM ('SUBMITTED', 'RESUBMITTED_ESTIMATION', 'RESUBMITTED_WORK', 'WORK_STARTED', 'COMPLETION_SUBMITTED', 'ESTIMATION_APPROVED', 'ESTIMATION_REJECTED_REVISION', 'ESTIMATION_REJECTED', 'WORK_APPROVED', 'WORK_REJECTED_REVISION', 'FINALIZED');

-- CreateEnum
CREATE TYPE "public"."HandlerType" AS ENUM ('BMS', 'REKANAN');

-- CreateEnum
CREATE TYPE "public"."ItemCondition" AS ENUM ('BAIK', 'RUSAK', 'TIDAK_ADA');

-- CreateEnum
CREATE TYPE "public"."PjumStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PreventiveCondition" AS ENUM ('OK', 'NOT_OK');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('DRAFT', 'PENDING_ESTIMATION', 'ESTIMATION_APPROVED', 'ESTIMATION_REJECTED_REVISION', 'ESTIMATION_REJECTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'REVIEW_REJECTED_REVISION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('BMS', 'BMC', 'BNM_MANAGER', 'BRANCH_ADMIN', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."ActivityLog" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "actorNIK" TEXT NOT NULL,
    "action" "public"."ActivityAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalLog" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "approverNIK" TEXT NOT NULL,
    "status" "public"."ReportStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoogleDriveFolderCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleDriveFolderCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PjumBankAccount" (
    "id" TEXT NOT NULL,
    "bmsNIK" TEXT NOT NULL,
    "bankAccountNo" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "addedByNIK" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PjumBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PjumExport" (
    "id" TEXT NOT NULL,
    "status" "public"."PjumStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "bmsNIK" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reportNumbers" TEXT[],
    "createdByNIK" TEXT NOT NULL,
    "approvedByNIK" TEXT,
    "approvedAt" TIMESTAMP(3),
    "pumBankAccountNo" TEXT,
    "pumBankAccountName" TEXT,
    "pumBankName" TEXT,
    "pumWeekNumber" INTEGER,
    "pumMonth" TEXT,
    "pumYear" INTEGER,
    "rejectionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PjumExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "reportNumber" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT '',
    "storeCode" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEstimation" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdByNIK" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "estimations" JSONB NOT NULL DEFAULT '[]',
    "startSelfieUrl" TEXT,
    "startReceiptUrls" JSONB NOT NULL DEFAULT '[]',
    "completionNotes" TEXT,
    "finishedAt" TIMESTAMP(3),
    "pjumExportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("reportNumber")
);

-- CreateTable
CREATE TABLE "public"."Store" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "NIK" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'BMS',
    "branchNames" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("NIK")
);

-- CreateIndex
CREATE INDEX "ActivityLog_actorNIK_idx" ON "public"."ActivityLog"("actorNIK" ASC);

-- CreateIndex
CREATE INDEX "ActivityLog_reportNumber_idx" ON "public"."ActivityLog"("reportNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveFolderCache_cacheKey_key" ON "public"."GoogleDriveFolderCache"("cacheKey" ASC);

-- CreateIndex
CREATE INDEX "PjumBankAccount_addedByNIK_idx" ON "public"."PjumBankAccount"("addedByNIK" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PjumBankAccount_bmsNIK_bankAccountNo_key" ON "public"."PjumBankAccount"("bmsNIK" ASC, "bankAccountNo" ASC);

-- CreateIndex
CREATE INDEX "PjumBankAccount_bmsNIK_idx" ON "public"."PjumBankAccount"("bmsNIK" ASC);

-- CreateIndex
CREATE INDEX "PjumExport_branchName_idx" ON "public"."PjumExport"("branchName" ASC);

-- CreateIndex
CREATE INDEX "PjumExport_createdByNIK_idx" ON "public"."PjumExport"("createdByNIK" ASC);

-- CreateIndex
CREATE INDEX "PjumExport_status_idx" ON "public"."PjumExport"("status" ASC);

-- CreateIndex
CREATE INDEX "Report_createdByNIK_idx" ON "public"."Report"("createdByNIK" ASC);

-- CreateIndex
CREATE INDEX "Report_createdByNIK_status_idx" ON "public"."Report"("createdByNIK" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportNumber_key" ON "public"."Report"("reportNumber" ASC);

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "public"."Report"("status" ASC);

-- CreateIndex
CREATE INDEX "Report_storeCode_idx" ON "public"."Report"("storeCode" ASC);

-- CreateIndex
CREATE INDEX "Report_storeCode_status_idx" ON "public"."Report"("storeCode" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Store_branchName_idx" ON "public"."Store"("branchName" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "public"."Store"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_actorNIK_fkey" FOREIGN KEY ("actorNIK") REFERENCES "public"."User"("NIK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_reportNumber_fkey" FOREIGN KEY ("reportNumber") REFERENCES "public"."Report"("reportNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalLog" ADD CONSTRAINT "ApprovalLog_approverNIK_fkey" FOREIGN KEY ("approverNIK") REFERENCES "public"."User"("NIK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalLog" ADD CONSTRAINT "ApprovalLog_reportNumber_fkey" FOREIGN KEY ("reportNumber") REFERENCES "public"."Report"("reportNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_createdByNIK_fkey" FOREIGN KEY ("createdByNIK") REFERENCES "public"."User"("NIK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_storeCode_fkey" FOREIGN KEY ("storeCode") REFERENCES "public"."Store"("code") ON DELETE SET NULL ON UPDATE CASCADE;
