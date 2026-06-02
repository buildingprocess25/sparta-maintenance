-- Optimize admin report detail and delete flows.
CREATE INDEX IF NOT EXISTS "PjumExport_reportNumbers_gin_idx"
    ON "PjumExport" USING GIN ("reportNumbers");

CREATE INDEX IF NOT EXISTS "ApprovalLog_reportNumber_idx"
    ON "ApprovalLog" ("reportNumber");
