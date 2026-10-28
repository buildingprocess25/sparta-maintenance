# Signage export rows

## Scope

Pure mapping from a report to signage export rows (I11–I13), one row per item. No DB, API, or UI changes in this task.

## Context and Sources

- `docs/superpowers/plans/2026-10-28-signage-xlsx-export.md` (Task 1)
- `lib/signage.ts`, `lib/checklist-data.ts`, `lib/time.ts`

## Changed Files

- `lib/signage-export.ts`: `SignageExportRow`, `formatJakartaQuarterLabel`, `toSignageExportRows`.
- `lib/signage-export.spec.ts`: spec for ordering, Tidak Ada, quarter label, non-signage reports.
- `docs/superpowers/plans/2026-10-28-signage-xlsx-export.md`: implementation plan.

## Decisions

- Report date and quarter use `createdAt` (same basis as export date filter and signage cooldown).
- Only items with OK/NOT_OK/TIDAK_ADA are exported; no Handler or follow-up column.

## Verification

- `npx tsx lib/signage-export.spec.ts` → passed.

## Remaining Work and Risks

API sheet and dialog follow in Tasks 2–3.
