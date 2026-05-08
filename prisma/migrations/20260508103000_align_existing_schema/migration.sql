-- Align existing schema drift without destructive changes

CREATE TABLE IF NOT EXISTS "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "uploadthingFileKeys" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "drivePhotoFileIds" JSONB NOT NULL DEFAULT '[]';
