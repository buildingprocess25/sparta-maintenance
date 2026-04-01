-- Add new status between PENDING_REVIEW and COMPLETED
ALTER TYPE "public"."ReportStatus" ADD VALUE IF NOT EXISTS 'APPROVED_BMC';

-- Rename existing final approval action to BNM-specific naming
DO $$
BEGIN
	ALTER TYPE "public"."ActivityAction" RENAME VALUE 'FINALIZED' TO 'FINAL_APPROVED_BNM';
EXCEPTION
	WHEN invalid_parameter_value THEN
		-- Value not found or already renamed
		NULL;
END $$;

-- Add new BNM rejection action
ALTER TYPE "public"."ActivityAction" ADD VALUE IF NOT EXISTS 'FINAL_REJECTED_REVISION_BNM';

-- Additional documentation fields for completion stage
ALTER TABLE "public"."Report"
ADD COLUMN IF NOT EXISTS "completionAdditionalPhotos" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "completionAdditionalNote" TEXT;
