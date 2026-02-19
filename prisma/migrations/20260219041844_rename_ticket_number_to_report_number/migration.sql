/*
  Warnings:

  - You are about to drop the column `branchCode` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `contactNumber` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `ticketNumber` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `nik` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reportNumber]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reportNumber` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Report_ticketNumber_key";

-- DropIndex
DROP INDEX "User_nik_key";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "branchCode",
DROP COLUMN "contactNumber",
DROP COLUMN "ticketNumber",
ADD COLUMN     "reportNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "nik";

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportNumber_key" ON "Report"("reportNumber");
