# Task 4: UI — Tambah Dropdown Bulan di Form Buat PJUM

## Scope

Added Month dropdown to the `pjum-view.tsx` form, auto-filling monthName based on `toDate`, validating monthName on search and export, resetting monthName on BMS change, and passing monthName to `exportPjum`.

## Context and Sources

- `d:\MAGANG-ALFA\sparta-maintenance\.superpowers\sdd\task-4-brief.md`
- `app/reports/pjum/_components/pjum-view.tsx`
- `app/reports/pjum/actions.ts`

## Changed Files

- `app/reports/pjum/_components/pjum-view.tsx`: Added `MONTH_OPTIONS`, `monthName` state, reset/auto-fill logic, validation, `exportPjum` parameter, and Month `<Select>` JSX element.

## Decisions

- Month dropdown options are in Indonesian ("Januari" - "Desember").
- When `toDate` is selected, `monthName` auto-fills using `date.toLocaleString("id-ID", { month: "long", timeZone: "Asia/Jakarta" })`.
- User can manually override or change the month in the dropdown after auto-fill.
- `isSearchReady`, `handleSearch`, and `handleExport` all enforce that `monthName` is selected.

## Verification

- `$env:NODE_OPTIONS="--max-old-space-size=4096"; npx tsc --noEmit` verified TypeScript compilation without errors.

## Remaining Work and Risks

None.
