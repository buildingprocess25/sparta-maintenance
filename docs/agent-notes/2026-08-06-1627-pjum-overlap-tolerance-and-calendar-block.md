# Perbaiki Logika Overlap PJUM & Block UI

## Scope

Task 3 updates the overlap logic in `app/reports/pjum/_components/pjum-view.tsx` to allow a 1-day end-of-range tolerance and visually block overlapped dates in the calendar picker.

Intentionally out of scope: `monthName` parameter in `exportPjum` call and `PjumHistoryRow` state type update (handled in Task 4).

## Context and Sources

- `.superpowers/sdd/task-3-brief.md`
- `app/reports/pjum/_components/pjum-view.tsx`

## Changed Files

- `app/reports/pjum/_components/pjum-view.tsx`:
  - Updated `findOverlappingRange` to treat `toDate` of existing range as exclusive (`from < blockedToExclusive && to >= blockedFrom`), allowing previous end-date to serve as start-date for new period.
  - Added `blockedRanges?: PjumBlockedRange[]` prop to `DatePickerField`.
  - Updated `disabled` predicate in `DatePickerField` to disable dates overlapping with `blockedRanges` up to `toExclusive`.
  - Passed `blockedRanges` prop to `DatePickerField` components for `fromDate` and `toDate`.

## Decisions

- Handled 1-day tolerance consistently between range overlap check and single-day calendar cell disabling logic.
- Kept day comparisons in `DatePickerField` as millisecond timestamps (`startOfDay(d).getTime()`) for performance and accuracy.

## Verification

- Ran TypeScript check via `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit`.
- Confirmed zero errors for `DatePickerField` and overlap changes. The only type errors present were the expected `monthName` missing errors in `exportPjum` call and `setHistoryRecords` state update, deferred to Task 4 as specified in brief.

## Remaining Work and Risks

- Deferred Task 4: Passing `monthName` state and props to `exportPjum` call in `pjum-view.tsx`.
