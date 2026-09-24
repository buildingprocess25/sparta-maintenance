-- AlterTable
ALTER TABLE "BmsBalancePeriod" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PjumExport" ADD COLUMN     "revisionHistory" JSONB NOT NULL DEFAULT '[]';
