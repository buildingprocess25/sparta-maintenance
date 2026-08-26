# Preventive Matrix Export Cell Format

## Scope

Improved the annual preventive matrix XLSX triwulan cell formatting so the date and BMS name are separated by a dash.

## Context and Sources

- `app/api/dashboard/preventive/annual-matrix-export/route.ts`
- User screenshot showing date and BMS name appearing connected in Excel.

## Changed Files

- `app/api/dashboard/preventive/annual-matrix-export/route.ts`: Changes exported triwulan cell text from newline-separated date and BMS to `date - BMS`.
- `app/api/dashboard/preventive/annual-matrix-export/route.spec.ts`: Adds a regression assertion for the formatted triwulan cell.
- `docs/agent-notes/2026-08-25-2201-preventive-matrix-export-cell-format.md`: Task note for this improvement.

## Decisions

- Used an inline dash separator instead of relying on Excel wrap text or row height behavior.
- Kept all export filters, nominal logic, workbook sheets, and dashboard behavior unchanged.

## Verification

- `.\node_modules\.bin\tsx.cmd app/api/dashboard/preventive/annual-matrix-export/route.spec.ts` passed.
- `.\node_modules\.bin\tsx.cmd app/dashboard/preventive/annual-matrix-export.spec.ts` passed.

## Remaining Work and Risks

- Manual browser download can be repeated to visually confirm the Excel cell now reads like `05 Jun 2026 - JULIYAN ERDIANSYAH`.
