-- CreateEnum
CREATE TYPE "AhoImportStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateTable
CREATE TABLE "AhoImportJob" (
    "id" TEXT NOT NULL,
    "status" "AhoImportStatus" NOT NULL DEFAULT 'pending',
    "requestedByNIK" TEXT NOT NULL,
    "fileBuffer" BYTEA NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AhoImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AhoImportJob_status_createdAt_idx" ON "AhoImportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AhoImportJob_requestedByNIK_idx" ON "AhoImportJob"("requestedByNIK");
