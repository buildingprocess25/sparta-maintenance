DROP TABLE IF EXISTS "public"."PjumBankAccount";

ALTER TABLE "public"."PjumExport"
  DROP COLUMN IF EXISTS "pumBankAccountNo",
  DROP COLUMN IF EXISTS "pumBankAccountName",
  DROP COLUMN IF EXISTS "pumBankName",
  DROP COLUMN IF EXISTS "pumWeekNumber",
  DROP COLUMN IF EXISTS "pumMonth",
  DROP COLUMN IF EXISTS "pumYear";
