ALTER TABLE "PjumExport"
ADD COLUMN "verificationToken" TEXT,
ADD COLUMN "verificationCode" TEXT;

CREATE UNIQUE INDEX "PjumExport_verificationToken_key"
ON "PjumExport"("verificationToken");

CREATE UNIQUE INDEX "PjumExport_verificationCode_key"
ON "PjumExport"("verificationCode");
