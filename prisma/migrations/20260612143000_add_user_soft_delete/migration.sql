ALTER TABLE "public"."User"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByNIK" TEXT;

CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");
