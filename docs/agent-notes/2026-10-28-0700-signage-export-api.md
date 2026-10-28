# Signage export API sheet

## Scope

Adds the `"signage"` sheet ("Rekap Signage") to `POST /api/admin/export` and allows BMC/BNM to request it with the existing branch scope. Dialog UI is Task 3.

## Context and Sources

- `docs/superpowers/plans/2026-10-28-signage-xlsx-export.md` (Task 2)
- `lib/signage-export.ts` (Task 1)

## Changed Files

- `app/admin/export/queries.ts`: `fetchSignageExportRows` (reuses `buildReportWhere`, ignores PJUM status, filters reports containing I11/I12/I13 via JSON `array_contains`).
- `app/api/admin/export/route.ts`: `buildSignageSheet` (16 columns) and wiring for split and combined workbooks.
- `app/api/admin/export/access.ts`: `ExportSheet` includes `"signage"`, allowed for limited roles.
- `app/api/admin/export/access.spec.ts`: signage access assertions.

## Decisions

- Default `sheets` list in the route is unchanged, so `/admin/export` keeps its current output.

## Verification

- `npx tsx app/api/admin/export/access.spec.ts` → failed before change, passed after.
- `npx tsx lib/signage-export.spec.ts` → passed.
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → no errors outside `.next/`.

## Remaining Work and Risks

Dialog wiring (Task 3) and manual export check remain.
