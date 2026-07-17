-- AlterTable: Add spartaUserId column to User table for SSO integration
ALTER TABLE "User" ADD COLUMN "spartaUserId" TEXT;

-- Add unique constraint on spartaUserId
ALTER TABLE "User" ADD CONSTRAINT "User_spartaUserId_key" UNIQUE ("spartaUserId");

-- CreateIndex: fast lookup by spartaUserId during SSO callback
CREATE INDEX "User_spartaUserId_idx" ON "User"("spartaUserId");
