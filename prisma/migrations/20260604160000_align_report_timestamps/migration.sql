-- Align report timestamps with product semantics:
-- - Report.finishedAt means final BNM approval time.
-- - Reports without a final BNM approval log should not carry a finishedAt value.
-- - Existing completed reports are backfilled from the final approval log when available.

UPDATE "Report"
SET "finishedAt" = NULL
WHERE "finishedAt" IS NOT NULL;

UPDATE "Report" AS r
SET "finishedAt" = final_log."createdAt"
FROM (
    SELECT
        "reportNumber",
        MAX("createdAt") AS "createdAt"
    FROM "ApprovalLog"
    WHERE "status" = 'COMPLETED'::"ReportStatus"
    GROUP BY "reportNumber"
) AS final_log
WHERE r."reportNumber" = final_log."reportNumber"
  AND r."status" = 'COMPLETED'::"ReportStatus";
