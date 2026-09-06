# Maintenance export brand column

## Scope

Added a Brand column to the `Rekap Laporan` maintenance XLSX export. PJUM, material, and preventive sheet layouts are outside this change.

## Context and Sources

- User requested an urgent main-branch change to add brand data to the XLSX export in the maintenance reports tab.
- `docs/project/01-overview.md` documents global XLSX report presentation expectations.
- `docs/superpowers/plans/2026-08-02-admin-brand-filter.md` records the existing brand model: `Store.brand = "LAWSON"` is Lawson; null, empty, or any non-Lawson value is Alfamart.
- `docs/agent-notes/2026-09-02-1611-maintenance-export-status-labels.md` records the current XLSX maintenance export boundary.
- `app/admin/export/queries.ts` fetches rows for the `Rekap Laporan` sheet.
- `app/api/admin/export/route.ts` builds the XLSX workbook.

## Changed Files

- `app/admin/export/queries.ts`: includes `store.brand` in report export rows.
- `app/api/admin/export/route.ts`: inserts a `Brand` column into `Rekap Laporan` and writes the formatted brand label.
- `lib/store-brand-filter.ts`: adds the shared XLSX brand label formatter.
- `lib/store-brand-filter.test.ts`: covers Lawson and Alfamart fallback label behavior.
- `docs/project/01-overview.md`: records that maintenance report XLSX exports include brand.
- `docs/agent-notes/2026-09-03-1154-maintenance-export-brand.md`: task note.

## Decisions

- Keep the brand value sourced from the related `Store` record instead of the report snapshot fields because brand is modeled on `Store`.
- Format only exact case-insensitive `LAWSON` as `Lawson`; all null, empty, and non-Lawson values are exported as `Alfamart`, matching the existing brand filter contract.
- Limit the new column to the maintenance report sheet requested by the user.

## Verification

- `node -e 'process.geteuid=()=>"codex"; require("D:/MAGANG-ALFA/sparta-maintenance/node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/store-brand-filter.test.ts")'` failed before implementation because `getStoreBrandExportLabel` did not exist.
- `node -e 'process.geteuid=()=>"codex"; require("D:/MAGANG-ALFA/sparta-maintenance/node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/store-brand-filter.test.ts")'` passed after implementation: 6 tests passed.
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false` passed after linking the worktree to the existing local `node_modules`.

## Remaining Work and Risks

None.
