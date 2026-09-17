# Task 2 Report: Dashboard BMC Create PJUM Enforcement

---

# Task 2 Report: Sync Execution and Cron Result

## Status

DONE

## Commit

- `1e09d59 feat: require hanging reports in pjum`

## Files Changed

- `app/dashboard/pjum/actions.ts`
- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`
- `docs/agent-notes/2026-09-03-1056-dashboard-bmc-pjum-enforcement.md`
- `.superpowers/sdd/task-2-report.md`

## Implementation Summary

- Added `PJUM_SELECTION_LIMIT` and `evaluatePjumSelectionPolicy` to
  `createDashboardPjum`.
- Built policy rows from the dashboard PJUM candidate report set using
  lifecycle-based active hanging detection:
  `pjumHangingAt` set, `pjumExpiredAt` null, and `pjumExportedAt` null.
- Rejected create requests that omit mandatory active hanging reports with:
  `Laporan gantung <numbers> wajib masuk PJUM periode ini`.
- Rejected create requests whose selected total exceeds Rp1,000,000 with:
  `Total nominal laporan yang akan di-PJUM-kan tidak boleh lebih dari Rp 1.000.000`.
- Replaced the old `finishedAt < fromDate` hanging report selection with the
  lifecycle-field rule.
- Added client-side policy evaluation in the BMC dashboard PJUM create dialog.
- Kept the existing search behavior that auto-selects all valid rows, including
  active hanging rows.
- Blocked manual unselect of selected hanging rows with the required toast copy.
- Made select-all deselect preserve valid hanging rows.
- Disabled hanging row checkboxes while keeping them checked.
- Added the over-limit summary warning with the required copy and
  `PJUM_SELECTION_LIMIT` formatting.

## Verification

- `npx tsx lib/pjum-selection-policy.spec.ts`
  - Failed because this checkout's Windows `npx` shim points at
    `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npx-cli.js`,
    which does not exist.
- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  - Passed.
  - Output: `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  - Passed.

## Git Hygiene

- Existing unrelated `package-lock.json` modification was not staged.
- Existing untracked `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
  was not staged.
- `.superpowers/sdd/task-2-brief.md` was read but not staged or modified.
=======
## Summary

Implemented Task 2 for the SPARTA Maintenance store sheet sync. The cron job
now reads sheet rows, compares them against current database stores with the
Task 1 `buildStoreSyncChanges` interface, creates missing stores, updates
changed matched stores, and returns the richer result shape:
`{ rows, created, updated, unchanged, skipped, invalidOwnershipValues, invalidCoordinateValues }`.

## Files Changed

- `lib/jobs/sync-stores.ts`
  - Added invalid ownership and coordinate source counters.
  - Added Prisma Decimal-to-string conversion for comparison.
  - Added ownership enum normalization for generated Prisma values.
  - Replaced the create-only executor with create/update execution based on
    `buildStoreSyncChanges`.
  - Kept existing store `isActive` untouched.
  - Left DB-only stores untouched.
- `scripts/sync-stores-from-sheet.ts`
  - Updated the CLI success message to include rows, created, updated,
    unchanged, skipped, invalid ownership, and invalid coordinate counts.
- `app/api/cron/sync-stores/route.spec.ts`
  - Added the source-level assertion that the route returns
    `NextResponse.json({ ok: true, ...result })`.
- `docs/project/07-integrations-and-env.md`
  - Added `POST /api/cron/sync-stores` to active cron endpoints.
  - Documented the Google Sheet columns, sheet-owned fields, create/update
    behavior, and explicit non-deletion/non-inactivation rule.
- `docs/agent-notes/2026-09-15-1102-sync-stores-sheet-upsert.md`
  - Added the required implementation task note.

## Compatibility Adjustments

No behavioral adjustments were needed. The only TypeScript compatibility detail
was using the brief's `asOwnershipType(String(store.ownershipType))` guard when
mapping Prisma enum values into the local `StoreOwnershipTypeValue` union.

## Verification

Focused tests were run with the required Windows workaround because direct
`node_modules\.bin\tsx.cmd` is known to fail in this environment.

```powershell
node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/sync-stores-from-sheet.spec.ts')"
```

Result:

```text
sync-stores-from-sheet tests passed
```

```powershell
node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/api/cron/sync-stores/route.spec.ts')"
```

Result:

```text
sync stores cron route tests passed
```

The route test also emitted the expected `CRON_SECRET is not configured` error
log while asserting the 500 misconfiguration path.

TypeScript check:

```powershell
node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Result: failed with Node heap out-of-memory.

Retry:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Result: passed with exit code 0.

## Commit

Created with message:

```text
feat: upsert stores from sheet sync
```
>>>>>>> main

## Concerns

None.

---

## Review Fix Report

## Status

DONE

## Files Changed

- `app/dashboard/pjum/actions.ts`
- `app/dashboard/pjum/actions.spec.ts`
- `docs/agent-notes/2026-09-03-1107-dashboard-pjum-review-fix.md`
- `.superpowers/sdd/task-2-report.md`

## Implementation Summary

- Updated dashboard active hanging candidate lookup to include balance periods
  with status `ACTIVE` or `LOCKED_PJUM`, scoped to the selected BMS NIK.
- Added an explicit server-side `createDashboardPjum` rejection for selected
  reports with `pjumExpiredAt` set:
  `Laporan <number> sudah hangus dan tidak bisa masuk PJUM`.
- Added `pjumExpiredAt: null` to the transaction `updateMany` that marks
  selected reports exported, preventing expired reports from being updated if
  state changes after validation.
- Added a focused dashboard action regression spec for the reviewed server-side
  constraints.
- Did not implement or touch BNM approval detail/list UI.

## Verification

- RED: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./app/dashboard/pjum/actions.spec.ts")'`
  failed before the action fix on the `LOCKED_PJUM` active hanging lookup
  assertion.
- GREEN: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./app/dashboard/pjum/actions.spec.ts")'`
  passed and printed `dashboard PJUM action assertions passed`.
- `npx tsx lib/pjum-selection-policy.spec.ts` failed because the local Windows
  `npx` shim points to a missing global npm CLI.
- Local fallback:
  `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  passed.

## Git Hygiene

- Existing unrelated `package-lock.json` modification was not staged.
- Existing untracked `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
  was not staged.

## Concerns

None.

---

## Review Fix: Preserve Persisted Update Code

Fixed the Task 2 review finding where a sheet code such as `U005` could match a
persisted DB store code `u005`, but the update payload still targeted `U005`.
`buildStoreSyncChanges` now emits the matched database store code for updates,
and `syncStoresFromSheet` preserves the raw Prisma `store.code` when preparing
DB rows for comparison. Create behavior is unchanged: newly created stores still
use the normalized sheet code from `parseStoreSheetRows`.

Regression coverage was added in `scripts/sync-stores-from-sheet.spec.ts` for a
DB row with `code: "u005"` matched by sheet row `U005`, asserting the update
targets `code: "u005"`.

Verification:

```powershell
node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/sync-stores-from-sheet.spec.ts')"
```

Result:

```text
sync-stores-from-sheet tests passed
```

```powershell
node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/api/cron/sync-stores/route.spec.ts')"
```

Result:

```text
sync stores cron route tests passed
```
>>>>>>> main
