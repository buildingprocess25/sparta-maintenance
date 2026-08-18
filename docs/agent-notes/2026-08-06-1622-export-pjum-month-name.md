# Task 2: Server Action `exportPjum` — Terima dan Simpan `monthName`

## Scope

Update server action `exportPjum` in `app/reports/pjum/actions.ts` to accept `monthName`, parse it, persist it to `PjumExport` table via Prisma, and expose `monthName` in `getBmcPjumHistory`.

## Context and Sources

- Brief: `file:///d:/MAGANG-ALFA/sparta-maintenance/.superpowers/sdd/task-2-brief.md`
- Target file: `file:///d:/MAGANG-ALFA/sparta-maintenance/app/reports/pjum/actions.ts`

## Changed Files

- `app/reports/pjum/actions.ts`:
  - Added `monthName: string` to `PjumHistoryRow` interface.
  - Added `monthName: z.string().min(1, "Bulan wajib diisi")` to `exportSchema`.
  - Added fallback `monthName` calculation in `getBmcPjumHistory`.
  - Updated `exportPjum` input parameter type signature to require `monthName: string`.
  - Destructured `monthName` from parsed input and persisted `monthName` in `tx.pjumExport.create`.

## Decisions

- Retained fallback in `getBmcPjumHistory` (`row.monthName ?? row.fromDate.toLocaleString("id-ID", { month: "long", timeZone: "Asia/Jakarta" })`) to gracefully handle legacy records created prior to `monthName` introduction.

## Verification

- Ran `$env:NODE_OPTIONS="--max-old-space-size=4096"; npx tsc --noEmit`.
- `app/reports/pjum/actions.ts` type checks without internal errors. Expected caller errors produced in `pjum-view.tsx` confirming signature update enforcement for Task 3.

## Remaining Work and Risks

- `pjum-view.tsx` caller needs to be updated to pass `monthName` in Task 3.
