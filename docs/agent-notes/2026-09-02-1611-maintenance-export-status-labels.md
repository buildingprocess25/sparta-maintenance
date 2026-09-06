# Maintenance export status labels

## Scope

Changed the admin maintenance XLSX export so the `Status` column in `Rekap Laporan` uses dashboard-friendly report status labels.

## Context and Sources

- User screenshots showed dashboard status badges using friendly labels while XLSX export showed raw status codes.
- User confirmed the scope is only the maintenance report `Status` column.
- `lib/report-status.ts` defines `getReportStatusLabel()`.
- `app/reports/[reportNumber]/_components/status-badge.tsx` uses `getReportStatusLabel()` for dashboard labels.
- `app/api/admin/export/route.ts` wrote `textCell(r.status)` in `buildReportSheet()`.
- `docs/project/01-overview.md` already required global status labels for report and PJUM statuses.

## Changed Files

- `app/api/admin/export/route.ts`: maps maintenance report status codes through `getReportStatusLabel()` before writing XLSX cells.
- `docs/project/01-overview.md`: documents that XLSX report status output should also use global labels.
- `docs/superpowers/plans/2026-09-02-maintenance-export-status-labels.md`: rapid implementation plan.
- `docs/agent-notes/2026-09-02-1611-maintenance-export-status-labels.md`: required task note for implementation.

## Decisions

- Keep filters, queries, and database values as raw status codes.
- Convert status code to user-facing text only in the XLSX report sheet builder.
- Leave the PJUM export sheet unchanged because it is outside the confirmed scope.
- Skip TDD by explicit user request; use fast verification instead.

## Verification

- `rg -n "import \{ getReportStatusLabel \}|textCell\(getReportStatusLabel\(r\.status\)\)|textCell\(r\.status\)" app/api/admin/export/route.ts` confirmed the maintenance sheet now uses `getReportStatusLabel(r.status)` and the remaining raw `textCell(r.status)` is only in the PJUM sheet.
- `rg -n "Export XLSX yang menampilkan status laporan" docs/project/01-overview.md` confirmed the canonical doc update.
- `git -c safe.directory='D:/MAGANG-ALFA/sparta-maintenance' diff --check` passed; only CRLF normalization warnings were reported.
- `node scripts/check-agent-task-note.mjs` passed after setting temporary Git `safe.directory` environment config for the command.
- `.\\node_modules\\.bin\\eslint.cmd app/api/admin/export/route.ts lib/report-status.ts` was started but interrupted after more than 60 seconds with no output to keep the rapid execution requested by the user.

## Remaining Work and Risks

- Full ESLint was not completed because it hung without output in this environment.
