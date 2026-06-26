CREATE INDEX IF NOT EXISTS "Report_reportNumber_pattern_idx"
    ON "Report" ("reportNumber" text_pattern_ops);
