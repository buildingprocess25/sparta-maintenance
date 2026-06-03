-- Optimize dashboard/preventive quarter compliance lookups.
CREATE INDEX IF NOT EXISTS "Store_branchName_code_idx"
    ON "Store" ("branchName", "code");

CREATE INDEX IF NOT EXISTS "Report_completed_createdAt_idx"
    ON "Report" ("createdAt" DESC)
    WHERE "status" = 'COMPLETED';

CREATE INDEX IF NOT EXISTS "Report_completed_branchName_createdAt_idx"
    ON "Report" ("branchName", "createdAt" DESC)
    WHERE "status" = 'COMPLETED';

CREATE INDEX IF NOT EXISTS "Report_completed_storeCode_createdAt_idx"
    ON "Report" ("storeCode", "createdAt" DESC)
    WHERE "status" = 'COMPLETED' AND "storeCode" IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Store_name_trgm_idx"
    ON "Store" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Store_code_trgm_idx"
    ON "Store" USING GIN ("code" gin_trgm_ops);
