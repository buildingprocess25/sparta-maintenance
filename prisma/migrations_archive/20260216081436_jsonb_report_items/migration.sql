/*
  Warnings:

  - You are about to drop the `MaterialEstimation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReportItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MaterialEstimation" DROP CONSTRAINT "MaterialEstimation_reportItemId_fkey";

-- DropForeignKey
ALTER TABLE "ReportItem" DROP CONSTRAINT "ReportItem_reportId_fkey";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "estimations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "items" JSONB NOT NULL DEFAULT '[]';

-- DropTable
DROP TABLE "MaterialEstimation";

-- DropTable
DROP TABLE "ReportItem";
