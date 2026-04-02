-- Add active flag for store master management
ALTER TABLE "Store"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
