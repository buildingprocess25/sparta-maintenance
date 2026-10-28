# Signage export dialog

## Scope

Adds a "Jenis Data" select (Rekap Laporan / Kondisi Signage) to the Laporan Maintenance export dialog. Signage disables the PJUM status filter and downloads `Rekap_Signage_yyyyMMdd.xlsx`.

## Context and Sources

- `docs/superpowers/plans/2026-10-28-signage-xlsx-export.md` (Task 3)
- `POST /api/admin/export` signage sheet (Task 2)

## Changed Files

- `app/dashboard/reports/_components/export-reports-dialog.tsx`: data type select, `sheets: [dataType]`, PJUM disabled for signage, signage file name.

## Decisions

- Data type is the first field; other filters (branch, brand, status, BMS, dates) still apply to signage.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → no errors outside `.next/`.
- `npx eslint` on changed files → only pre-existing findings (`no-explicit-any` in `buildPreventiveSheet`, unescaped quotes in the existing "Selesai" hint), confirmed against the previous commit.

## Remaining Work and Risks

Build and manual browser export check (Task 4).
