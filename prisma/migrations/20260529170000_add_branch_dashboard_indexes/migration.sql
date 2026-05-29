-- Optimize admin branch performance dashboards.
CREATE INDEX IF NOT EXISTS "Report_branchName_status_createdAt_idx"
    ON "Report" ("branchName", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Report_branchName_status_finishedAt_idx"
    ON "Report" ("branchName", "status", "finishedAt");

CREATE INDEX IF NOT EXISTS "Report_branchName_status_updatedAt_idx"
    ON "Report" ("branchName", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "Report_branchName_status_pjumExportedAt_idx"
    ON "Report" ("branchName", "status", "pjumExportedAt");

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx"
    ON "ActivityLog" ("createdAt");

CREATE INDEX IF NOT EXISTS "User_primaryBranch_idx"
    ON "User" (("branchNames"[1]));

CREATE INDEX IF NOT EXISTS "User_branchNames_gin_idx"
    ON "User" USING GIN ("branchNames");
