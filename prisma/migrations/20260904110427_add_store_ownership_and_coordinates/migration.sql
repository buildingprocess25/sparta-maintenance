-- CreateEnum
CREATE TYPE "StoreOwnershipType" AS ENUM ('REGULAR', 'FRANCHISE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "ownershipType" "StoreOwnershipType" NOT NULL DEFAULT 'UNKNOWN';
